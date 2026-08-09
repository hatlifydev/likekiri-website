import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

// El .env canónico vive en la raíz del monorepo.
for (const candidate of [resolve(__dirname, '../../../../.env'), resolve(__dirname, '../../.env')]) {
  if (existsSync(candidate)) loadDotenv({ path: candidate, override: false });
}

import { loadConfig } from '../config';
import { PrismaService } from '../prisma.service';
import { AuthService, SUPERADMIN_ROLE_KEY } from '../auth/auth.service';
import { InvitationsService } from '../auth/invitations.service';

/** Permisos base de la plataforma (los de módulos llegan por manifest). */
const BASE_PERMISSIONS: Array<{ key: string; label: string }> = [
  { key: 'users.read', label: 'Ver usuarios e invitaciones' },
  { key: 'users.invite', label: 'Invitar usuarios' },
  { key: 'users.manage', label: 'Activar y desactivar usuarios' },
  { key: 'sessions.revoke', label: 'Revocar sesiones de otros' },
  { key: 'registry.read', label: 'Ver el registry de módulos' },
  { key: 'shell.manage', label: 'Gestionar la estructura del sitio público' },
];

function argValue(name: string): string | null {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(`--${name}=`)) return arg.slice(name.length + 3);
  }
  return null;
}

async function main(): Promise<void> {
  const email = argValue('email') ?? process.env.SEED_EMAIL ?? null;
  if (email === null || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('uso: pnpm --filter core seed:admin --email=admin@dominio.com');
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const prisma = new PrismaService(config.databaseUrl);
  await prisma.$connect();
  try {
    for (const permission of BASE_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: permission.key },
        create: permission,
        update: { label: permission.label },
      });
    }

    const role = await prisma.role.upsert({
      where: { key: SUPERADMIN_ROLE_KEY },
      create: { key: SUPERADMIN_ROLE_KEY, label: 'Superadministrador' },
      update: {},
    });
    const permissions = await prisma.permission.findMany();
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
    // Rol de operador sin permisos de módulo: útil para probar el filtrado.
    await prisma.role.upsert({
      where: { key: 'operador' },
      create: { key: 'operador', label: 'Operador' },
      update: {},
    });

    const auth = new AuthService(prisma, config);
    const invitations = new InvitationsService(prisma, auth, config);
    const invitation = await invitations.create(email, role.id, null, null);

    // El token plano se muestra UNA sola vez, aquí. En la base solo vive su hash.
    console.log('');
    console.log('Invitación de superadmin creada (un solo uso, vence ' + invitation.expiresAt.toISOString() + '):');
    console.log('');
    console.log('  ' + invitation.acceptUrl);
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

void main();
