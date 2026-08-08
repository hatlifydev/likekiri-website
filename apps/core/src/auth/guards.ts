import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AuthService, type AuthContext } from './auth.service';
import { readCookie, SESSION_COOKIE } from './tokens';

export interface AuthedRequest extends Request {
  auth?: AuthContext;
}

/** Exige sesión válida; deja el contexto en req.auth. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = readCookie(request.headers.cookie, SESSION_COOKIE);
    if (token === null) {
      throw new UnauthorizedException('sesión requerida');
    }
    const auth = await this.auth.sessionFromToken(token);
    if (auth === null) {
      throw new UnauthorizedException('sesión requerida');
    }
    request.auth = auth;
    return true;
  }
}

const PERMISSIONS_KEY = 'likekiri:permissions';

/** Permisos requeridos por el handler; se evalúan tras SessionGuard. */
export const RequirePermissions = (
  ...permissions: string[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (required === undefined || required.length === 0) return true;
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const auth = request.auth;
    if (auth === undefined) {
      throw new UnauthorizedException('sesión requerida');
    }
    const missing = required.filter((permission) => !auth.permissions.has(permission));
    if (missing.length > 0) {
      throw new ForbiddenException('permisos insuficientes');
    }
    return true;
  }
}
