import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';

import { CORE_CONFIG, type CoreConfig } from '../config';
import { AuthService } from './auth.service';
import { InvitationsService } from './invitations.service';
import { SessionGuard, type AuthedRequest } from './guards';
import { SESSION_COOKIE } from './tokens';

const LoginSchema = z.strictObject({
  email: z.string().min(3).max(320),
  password: z.string().min(1).max(1024),
});

const AcceptInviteSchema = z.strictObject({
  token: z.string().min(20).max(200),
  password: z.string().min(1).max(1024),
});

const ChangePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(1).max(1024),
});

function clientIp(req: Request): string | null {
  // Caddy termina TLS en el mismo host; el remoto directo es suficiente.
  return req.socket.remoteAddress ?? null;
}

@Controller('api/auth')
export class AuthController {
  constructor(
    @Inject(CORE_CONFIG) private readonly config: CoreConfig,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService,
  ) {}

  @Post('login')
  async login(@Body() body: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('petición inválida');
    }
    const { token, expiresAt } = await this.auth.login(
      parsed.data.email,
      parsed.data.password,
      clientIp(req),
      req.headers['user-agent'] ?? null,
    );
    this.setSessionCookie(res, token, expiresAt);
    res.json({ ok: true });
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logout(@Req() req: AuthedRequest, @Res() res: Response): Promise<void> {
    if (req.auth) await this.auth.logout(req.auth.sessionId);
    this.clearSessionCookie(res);
    res.json({ ok: true });
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() req: AuthedRequest): {
    email: string;
    userId: string;
    isSuperadmin: boolean;
    permissions: string[];
    firstName: string | null;
    title: string | null;
    displayName: string | null;
    lang: string;
  } {
    const auth = req.auth;
    if (!auth) throw new BadRequestException();
    return {
      email: auth.email,
      userId: auth.userId,
      isSuperadmin: auth.isSuperadmin,
      permissions: auth.isSuperadmin ? ['*'] : [...auth.permissions],
      firstName: auth.firstName,
      title: auth.title,
      displayName: auth.displayName,
      lang: auth.lang,
    };
  }

  @Post('lang')
  @UseGuards(SessionGuard)
  async setLang(@Body() body: unknown, @Req() req: AuthedRequest): Promise<{ ok: true; lang: string }> {
    const parsed = z.strictObject({ lang: z.enum(['es', 'en']) }).safeParse(body);
    if (!parsed.success || !req.auth) throw new BadRequestException('idioma inválido');
    await this.auth.setLang(req.auth.userId, parsed.data.lang);
    return { ok: true, lang: parsed.data.lang };
  }

  /** Pantalla de aceptar invitación: valida el token con respuesta genérica. */
  @Get('invitation')
  async invitation(@Query('token') token: string | undefined): Promise<{ email: string }> {
    if (typeof token !== 'string') throw new BadRequestException('petición inválida');
    return this.invitations.peek(token);
  }

  @Post('accept-invite')
  async acceptInvite(@Body() body: unknown, @Req() req: Request): Promise<{ ok: true; email: string }> {
    const parsed = AcceptInviteSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('petición inválida');
    }
    const { email } = await this.invitations.accept(
      parsed.data.token,
      parsed.data.password,
      clientIp(req),
    );
    return { ok: true, email };
  }

  @Post('change-password')
  @UseGuards(SessionGuard)
  async changePassword(@Body() body: unknown, @Req() req: AuthedRequest): Promise<{ ok: true }> {
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success || !req.auth) {
      throw new BadRequestException('petición inválida');
    }
    await this.auth.changePassword(
      req.auth,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      clientIp(req),
    );
    return { ok: true };
  }

  private setSessionCookie(res: Response, token: string, expiresAt: Date): void {
    // Cookie opaca, no JWT. __Host- exige Secure + Path=/ y sin Domain.
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  }

  private clearSessionCookie(res: Response): void {
    res.cookie(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
  }
}
