import { BadRequestException, Injectable } from '@nestjs/common';

import type { CoreConfig } from '../config';
import type { PrismaService } from '../prisma.service';
import type { AuthContext } from './auth.service';
import { AuthService } from './auth.service';
import { hashPassword, validateNewPassword } from './passwords';
import { generateToken, sha256Hex } from './tokens';

/**
 * Mensaje único para cualquier fallo con un token de invitación: no se revela
 * si el token existe, expiró, fue revocado o ya se usó.
 */
const GENERIC_INVITE_ERROR = 'la invitación no es válida o ya no está disponible';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly config: CoreConfig,
  ) {}

  /** Crea una invitación y devuelve el token plano — visible UNA sola vez. */
  async create(
    email: string,
    roleId: string,
    actor: AuthContext | null,
    ip: string | null,
  ): Promise<{ id: string; token: string; expiresAt: Date; acceptUrl: string }> {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('email inválido');
    }
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (role === null) {
      throw new BadRequestException('el rol indicado no existe');
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + this.config.inviteTtlHours * 3_600_000);
    const invitation = await this.prisma.invitation.create({
      data: {
        email: normalized,
        tokenHash: sha256Hex(token),
        roleId,
        invitedBy: actor?.userId ?? 'seed',
        expiresAt,
      },
    });
    await this.auth.audit(actor?.userId ?? null, 'invitation.created', invitation.id, { email: normalized, role: role.key }, ip);
    return {
      id: invitation.id,
      token,
      expiresAt,
      acceptUrl: `${this.config.adminBaseUrl}/accept-invite?token=${token}`,
    };
  }

  /** Validación previa para la pantalla de aceptar: respuesta genérica. */
  async peek(token: string): Promise<{ email: string }> {
    const invitation = await this.findUsable(token);
    return { email: invitation.email };
  }

  /** Acepta la invitación: crea el usuario con la contraseña que él definió. */
  async accept(token: string, password: string, ip: string | null): Promise<{ email: string }> {
    const invitation = await this.findUsable(token);

    const problem = validateNewPassword(password);
    if (problem !== null) {
      throw new BadRequestException(problem);
    }
    const existing = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });
    if (existing !== null) {
      // Mismo mensaje genérico: no filtra que el email ya tiene cuenta.
      throw new BadRequestException(GENERIC_INVITE_ERROR);
    }

    const passwordHash = await hashPassword(password);
    const user = await this.prisma.$transaction(async (tx) => {
      // La invitación queda quemada de forma atómica: un solo uso.
      const burned = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (burned.count !== 1) {
        throw new BadRequestException(GENERIC_INVITE_ERROR);
      }
      return tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          roles: { create: { roleId: invitation.roleId } },
        },
      });
    });
    await this.auth.audit(user.id, 'invitation.accepted', invitation.id, { email: invitation.email }, ip);
    return { email: user.email };
  }

  async revoke(id: string, actor: AuthContext, ip: string | null): Promise<void> {
    const result = await this.prisma.invitation.updateMany({
      where: { id, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) {
      throw new BadRequestException('la invitación no se puede revocar');
    }
    await this.auth.audit(actor.userId, 'invitation.revoked', id, {}, ip);
  }

  /** Reenviar = revocar la anterior y emitir una nueva con token nuevo. */
  async resend(
    id: string,
    actor: AuthContext,
    ip: string | null,
  ): Promise<{ id: string; token: string; expiresAt: Date; acceptUrl: string }> {
    const previous = await this.prisma.invitation.findUnique({ where: { id } });
    if (previous === null || previous.acceptedAt !== null) {
      throw new BadRequestException('la invitación no se puede reenviar');
    }
    await this.prisma.invitation.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return this.create(previous.email, previous.roleId, actor, ip);
  }

  async list(): Promise<
    Array<{
      id: string;
      email: string;
      role: string;
      createdAt: Date;
      expiresAt: Date;
      status: 'pendiente' | 'aceptada' | 'revocada' | 'expirada';
    }>
  > {
    const invitations = await this.prisma.invitation.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const now = new Date();
    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role.label,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      status:
        invitation.acceptedAt !== null
          ? 'aceptada'
          : invitation.revokedAt !== null
            ? 'revocada'
            : invitation.expiresAt <= now
              ? 'expirada'
              : 'pendiente',
    }));
  }

  private async findUsable(token: string): Promise<{
    id: string;
    email: string;
    roleId: string;
  }> {
    if (typeof token !== 'string' || token.length < 20) {
      throw new BadRequestException(GENERIC_INVITE_ERROR);
    }
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: sha256Hex(token) },
    });
    if (
      invitation === null ||
      invitation.acceptedAt !== null ||
      invitation.revokedAt !== null ||
      invitation.expiresAt <= new Date()
    ) {
      throw new BadRequestException(GENERIC_INVITE_ERROR);
    }
    return { id: invitation.id, email: invitation.email, roleId: invitation.roleId };
  }
}
