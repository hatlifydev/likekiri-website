import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { config as loadDotenv } from 'dotenv';

const rootEnv = resolve(__dirname, '../../../.env');
if (existsSync(rootEnv)) loadDotenv({ path: rootEnv, override: false });

const TEST_URL = process.env.DATABASE_URL_TEST;

import { loadConfig } from '../src/config';
import { PrismaService } from '../src/prisma.service';
import { AuthService, SUPERADMIN_ROLE_KEY } from '../src/auth/auth.service';
import { InvitationsService } from '../src/auth/invitations.service';
import { sha256Hex } from '../src/auth/tokens';

// Flujo completo de invitaciones y sesiones contra Postgres real.
// Si no hay base de test configurada (clone sin Postgres), se omite entero.
describe('auth e2e', { skip: TEST_URL === undefined ? 'sin DATABASE_URL_TEST' : false }, () => {
  const config = loadConfig({
    ...process.env,
    DATABASE_URL: TEST_URL ?? '',
    INVITE_TTL_HOURS: '72',
    SESSION_TTL_HOURS: '1',
  });
  let prisma: PrismaService;
  let auth: AuthService;
  let invitations: InvitationsService;
  let roleId = '';

  before(async () => {
    prisma = new PrismaService(config.databaseUrl);
    await prisma.$connect();
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.session.deleteMany(),
      prisma.invitation.deleteMany(),
      prisma.userRole.deleteMany(),
      prisma.rolePermission.deleteMany(),
      prisma.user.deleteMany(),
      prisma.permission.deleteMany(),
      prisma.role.deleteMany(),
    ]);
    auth = new AuthService(prisma, config);
    invitations = new InvitationsService(prisma, auth, config);
    const role = await prisma.role.create({
      data: { key: SUPERADMIN_ROLE_KEY, label: 'Superadmin' },
    });
    roleId = role.id;
  });

  after(async () => {
    await prisma.$disconnect();
  });

  test('el token de invitación no se guarda en texto plano', async () => {
    const invitation = await invitations.create('uno@likekiri.com', roleId, null, null);
    const stored = await prisma.invitation.findUnique({ where: { id: invitation.id } });
    assert.ok(stored);
    assert.notEqual(stored.tokenHash, invitation.token);
    assert.equal(stored.tokenHash, sha256Hex(invitation.token));
    assert.equal(stored.tokenHash.length, 64);
  });

  test('aceptar exige contraseña de 12+ y no filtrada', async () => {
    const invitation = await invitations.create('dos@likekiri.com', roleId, null, null);
    await assert.rejects(() => invitations.accept(invitation.token, 'corta', null));
    await assert.rejects(() => invitations.accept(invitation.token, 'password1234', null));
    const result = await invitations.accept(invitation.token, 'frase larga y digna 42', null);
    assert.equal(result.email, 'dos@likekiri.com');
  });

  test('la invitación es de un solo uso: reutilizar el link falla genérico', async () => {
    const invitation = await invitations.create('tres@likekiri.com', roleId, null, null);
    await invitations.accept(invitation.token, 'otra frase digna 77', null);
    await assert.rejects(
      () => invitations.accept(invitation.token, 'da igual la clave 99', null),
      /no es válida/,
    );
    // También falla la consulta previa, con el mismo mensaje genérico.
    await assert.rejects(() => invitations.peek(invitation.token), /no es válida/);
  });

  test('un token inexistente y uno quemado devuelven el mismo error', async () => {
    const fake = 'x'.repeat(43);
    await assert.rejects(() => invitations.peek(fake), /no es válida/);
  });

  test('dos usuarios con la misma contraseña tienen hashes distintos', async () => {
    const a = await invitations.create('cuatro@likekiri.com', roleId, null, null);
    const b = await invitations.create('cinco@likekiri.com', roleId, null, null);
    const shared = 'la misma clave para ambos';
    await invitations.accept(a.token, shared, null);
    await invitations.accept(b.token, shared, null);
    const users = await prisma.user.findMany({
      where: { email: { in: ['cuatro@likekiri.com', 'cinco@likekiri.com'] } },
    });
    assert.equal(users.length, 2);
    assert.notEqual(users[0]?.passwordHash, users[1]?.passwordHash);
    assert.ok(users[0]?.passwordHash.startsWith('$argon2id$'));
  });

  test('login correcto emite sesión opaca; el hash vive en la base', async () => {
    const { token } = await auth.login('dos@likekiri.com', 'frase larga y digna 42', null, 'test');
    const session = await prisma.session.findUnique({ where: { tokenHash: sha256Hex(token) } });
    assert.ok(session, 'la sesión se busca por hash, nunca por token plano');
    const context = await auth.sessionFromToken(token);
    assert.equal(context?.email, 'dos@likekiri.com');
    assert.equal(context?.isSuperadmin, true);
    await auth.logout(context!.sessionId);
    assert.equal(await auth.sessionFromToken(token), null);
  });

  test('5 fallos bloquean la cuenta y el error no cambia', async () => {
    const email = 'tres@likekiri.com';
    for (let i = 0; i < 5; i += 1) {
      await assert.rejects(
        () => auth.login(email, 'clave equivocada aposta', `10.0.0.${i}`, null),
        /correo o contraseña incorrectos/,
      );
    }
    const user = await prisma.user.findUnique({ where: { email } });
    assert.ok(user?.lockedUntil && user.lockedUntil > new Date(), 'lockedUntil debe quedar en el futuro');
    // Incluso con la contraseña CORRECTA, bloqueada responde igual de genérico.
    await assert.rejects(
      () => auth.login(email, 'otra frase digna 77', '10.0.1.1', null),
      /correo o contraseña incorrectos/,
    );
  });

  test('email inexistente responde con el mismo mensaje', async () => {
    await assert.rejects(
      () => auth.login('nadie@likekiri.com', 'lo que sea aquí 123', '10.0.2.1', null),
      /correo o contraseña incorrectos/,
    );
  });

  test('cambiar contraseña revoca las demás sesiones', async () => {
    const first = await auth.login('dos@likekiri.com', 'frase larga y digna 42', null, null);
    const second = await auth.login('dos@likekiri.com', 'frase larga y digna 42', null, null);
    const context = await auth.sessionFromToken(second.token);
    assert.ok(context);
    await auth.changePassword(context, 'frase larga y digna 42', 'nueva frase maestra 84', null);
    assert.equal(await auth.sessionFromToken(first.token), null, 'la otra sesión cae');
    assert.ok(await auth.sessionFromToken(second.token), 'la sesión actual sobrevive');
    const again = await auth.login('dos@likekiri.com', 'nueva frase maestra 84', null, null);
    assert.ok(again.token);
  });
});
