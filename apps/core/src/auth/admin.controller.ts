import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { RegistryService, type ModuleStatusDto } from '../registry/registry.service';
import type { PrismaService } from '../prisma.service';
import { PRISMA } from './auth.module-tokens';
import { AuthService } from './auth.service';
import { InvitationsService } from './invitations.service';
import { PermissionsGuard, RequirePermissions, SessionGuard, type AuthedRequest } from './guards';

const CreateInvitationSchema = z.strictObject({
  email: z.string().min(3).max(320),
  roleId: z.string().min(1),
});

const FichaSchema = z.strictObject({
  displayName: z.string().max(120).nullable(),
  firstName: z.string().max(60).nullable(),
  title: z.string().max(120).nullable(),
  bio: z.string().max(2000).nullable(),
  initials: z.string().max(4).nullable(),
  enEquipo: z.boolean(),
  teamOrder: z.number().int().min(0).max(999),
});

@Controller('api/admin')
@UseGuards(SessionGuard, PermissionsGuard)
export class AdminController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService,
    @Inject(RegistryService) private readonly registry: RegistryService,
  ) {}

  @Get('users')
  @RequirePermissions('users.read')
  async users(): Promise<
    Array<{
      id: string;
      email: string;
      status: string;
      roles: string[];
      lastLoginAt: Date | null;
      createdAt: Date;
      activeSessions: number;
    }>
  > {
    const users = await this.prisma.user.findMany({
      include: {
        roles: { include: { role: true } },
        sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role.label),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      activeSessions: user.sessions.length,
      ficha: {
        displayName: user.displayName,
        firstName: user.firstName,
        title: user.title,
        bio: user.bio,
        initials: user.initials,
        enEquipo: user.enEquipo,
        teamOrder: user.teamOrder,
      },
    }));
  }

  /**
   * Roster de agentes del chat: usuarios activos que pueden responder
   * (rol superadmin o con permiso chat.write). Lo consume el módulo chat para
   * transferir conversaciones. Guardado con chat.read (un agente puede verlo).
   */
  @Get('agents')
  @RequirePermissions('chat.read')
  async agents(): Promise<Array<{ id: string; nombre: string; title: string | null }>> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roles: {
          some: {
            role: {
              OR: [
                { key: 'superadmin' },
                { permissions: { some: { permission: { key: 'chat.write' } } } },
              ],
            },
          },
        },
      },
      select: { id: true, displayName: true, firstName: true, email: true, title: true },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      nombre: u.displayName ?? u.firstName ?? u.email,
      title: u.title,
    }));
  }

  @Post('users/:id/ficha')
  @RequirePermissions('users.manage')
  async updateFicha(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ): Promise<{ ok: true }> {
    const parsed = FichaSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('ficha inválida');
    }
    await this.prisma.user.update({ where: { id }, data: parsed.data });
    await this.auth.audit(req.auth?.userId ?? null, 'ficha.updated', id, {}, null);
    return { ok: true };
  }

  @Post('users/:id/disable')
  @RequirePermissions('users.manage')
  async disableUser(@Param('id') id: string, @Req() req: AuthedRequest): Promise<{ ok: true }> {
    if (req.auth?.userId === id) {
      throw new BadRequestException('no puedes desactivar tu propia cuenta');
    }
    await this.prisma.user.update({ where: { id }, data: { status: 'DISABLED' } });
    await this.auth.revokeUserSessions(id, req.auth!, req.socket.remoteAddress ?? null);
    await this.auth.audit(req.auth?.userId ?? null, 'user.disabled', id, {}, null);
    return { ok: true };
  }

  @Post('users/:id/enable')
  @RequirePermissions('users.manage')
  async enableUser(@Param('id') id: string, @Req() req: AuthedRequest): Promise<{ ok: true }> {
    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', failedLogins: 0, lockedUntil: null },
    });
    await this.auth.audit(req.auth?.userId ?? null, 'user.enabled', id, {}, null);
    return { ok: true };
  }

  @Post('users/:id/revoke-sessions')
  @RequirePermissions('sessions.revoke')
  async revokeSessions(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<{ ok: true; revoked: number }> {
    const revoked = await this.auth.revokeUserSessions(
      id,
      req.auth!,
      req.socket.remoteAddress ?? null,
    );
    return { ok: true, revoked };
  }

  @Get('roles')
  @RequirePermissions('users.read')
  async roles(): Promise<Array<{ id: string; key: string; label: string }>> {
    return this.prisma.role.findMany({ select: { id: true, key: true, label: true } });
  }

  @Get('invitations')
  @RequirePermissions('users.read')
  invitationsList(): ReturnType<InvitationsService['list']> {
    return this.invitations.list();
  }

  @Post('invitations')
  @RequirePermissions('users.invite')
  async createInvitation(
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ): Promise<{ id: string; acceptUrl: string; expiresAt: Date }> {
    const parsed = CreateInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('petición inválida');
    }
    // El token plano se devuelve UNA sola vez, dentro de acceptUrl.
    return this.invitations.create(
      parsed.data.email,
      parsed.data.roleId,
      req.auth ?? null,
      req.socket.remoteAddress ?? null,
    );
  }

  @Post('invitations/:id/revoke')
  @RequirePermissions('users.invite')
  async revokeInvitation(@Param('id') id: string, @Req() req: AuthedRequest): Promise<{ ok: true }> {
    await this.invitations.revoke(id, req.auth!, req.socket.remoteAddress ?? null);
    return { ok: true };
  }

  @Post('invitations/:id/resend')
  @RequirePermissions('users.invite')
  resendInvitation(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): ReturnType<InvitationsService['resend']> {
    return this.invitations.resend(id, req.auth!, req.socket.remoteAddress ?? null);
  }

  @Get('registry')
  @RequirePermissions('registry.read')
  registryStatus(): ModuleStatusDto[] {
    return this.registry.status();
  }
}
