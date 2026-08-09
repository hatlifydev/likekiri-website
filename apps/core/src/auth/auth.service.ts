import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import type { CoreConfig } from '../config';
import type { PrismaService } from '../prisma.service';
import { dummyHash, hashPassword, validateNewPassword, verifyPassword } from './passwords';
import { SlidingWindowLimiter } from './rate-limit';
import { generateToken, sha256Hex } from './tokens';

/** Set que contiene todo: los superadmin no se filtran permiso a permiso. */
class AllPermissions extends Set<string> {
  override has(): boolean {
    return true;
  }
}

export interface AuthContext {
  userId: string;
  email: string;
  sessionId: string;
  isSuperadmin: boolean;
  permissions: ReadonlySet<string>;
  /** Ficha de la persona (para firmar el chat y mostrar en el admin). */
  firstName: string | null;
  title: string | null;
  displayName: string | null;
}

/** Mensaje único para credenciales malas: no revela si la cuenta existe. */
const GENERIC_LOGIN_ERROR = 'correo o contraseña incorrectos';

const MAX_FAILED_BEFORE_LOCK = 5;
const MAX_LOCK_MINUTES = 60;

export const SUPERADMIN_ROLE_KEY = 'superadmin';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // 10 intentos de login por IP por minuto.
  private readonly ipLimiter = new SlidingWindowLimiter(10, 60_000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: CoreConfig,
  ) {}

  async login(
    email: string,
    password: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<{ token: string; expiresAt: Date }> {
    if (ip !== null && !this.ipLimiter.allow(`login:${ip}`)) {
      // Mismo mensaje genérico: un atacante no distingue el rate limit.
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    if (user === null) {
      // Verificación de sacrificio para igualar el tiempo de respuesta.
      await verifyPassword(await dummyHash(), password);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const now = new Date();
    if (user.status !== 'ACTIVE' || (user.lockedUntil !== null && user.lockedUntil > now)) {
      await verifyPassword(await dummyHash(), password);
      await this.audit(null, 'login.blocked', user.id, { reason: user.status !== 'ACTIVE' ? 'disabled' : 'locked' }, ip);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      const failed = user.failedLogins + 1;
      // Bloqueo exponencial tras 5 fallos: 1, 2, 4, 8… minutos (tope 60).
      const lockedUntil =
        failed >= MAX_FAILED_BEFORE_LOCK
          ? new Date(
              now.getTime() +
                Math.min(2 ** (failed - MAX_FAILED_BEFORE_LOCK), MAX_LOCK_MINUTES) * 60_000,
            )
          : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: failed, lockedUntil },
      });
      await this.audit(null, 'login.failed', user.id, { failed }, ip);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    // Rotación: cada login emite un token nuevo; nunca se reutiliza uno viejo.
    const token = generateToken();
    const expiresAt = new Date(now.getTime() + this.config.sessionTtlHours * 3_600_000);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now },
      }),
      this.prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: sha256Hex(token),
          expiresAt,
          ip,
          userAgent: userAgent?.slice(0, 300) ?? null,
        },
      }),
    ]);
    await this.audit(user.id, 'login.success', user.id, {}, ip);
    return { token, expiresAt };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Resuelve el contexto de auth desde el token de la cookie, o null. */
  async sessionFromToken(token: string): Promise<AuthContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256Hex(token) },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: { include: { permissions: { include: { permission: true } } } },
              },
            },
          },
        },
      },
    });
    if (
      session === null ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE'
    ) {
      return null;
    }
    const roleKeys = session.user.roles.map((userRole) => userRole.role.key);
    const isSuperadmin = roleKeys.includes(SUPERADMIN_ROLE_KEY);
    const permissions = isSuperadmin
      ? new AllPermissions()
      : new Set(
          session.user.roles.flatMap((userRole) =>
            userRole.role.permissions.map((rp) => rp.permission.key),
          ),
        );
    return {
      userId: session.user.id,
      email: session.user.email,
      sessionId: session.id,
      isSuperadmin,
      permissions,
      firstName: session.user.firstName,
      title: session.user.title,
      displayName: session.user.displayName,
    };
  }

  async changePassword(
    auth: AuthContext,
    currentPassword: string,
    newPassword: string,
    ip: string | null,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: auth.userId } });
    if (user === null || !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new UnauthorizedException('la contraseña actual no es correcta');
    }
    const problem = validateNewPassword(newPassword);
    if (problem !== null) {
      throw new UnauthorizedException(problem);
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(newPassword) },
      }),
      // Cambiar la contraseña revoca todas las demás sesiones.
      this.prisma.session.updateMany({
        where: { userId: user.id, id: { not: auth.sessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit(user.id, 'password.changed', user.id, {}, ip);
  }

  async revokeUserSessions(targetUserId: string, actor: AuthContext, ip: string | null): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit(actor.userId, 'sessions.revoked', targetUserId, { count: result.count }, ip);
    return result.count;
  }

  async audit(
    actorId: string | null,
    action: string,
    target: string | null,
    meta: Record<string, unknown>,
    ip: string | null,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: { actorId, action, target, meta: meta as object, ip },
      });
    } catch (error) {
      this.logger.error(`no se pudo escribir el audit log (${action}): ${String(error)}`);
    }
  }
}
