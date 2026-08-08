import { Module } from '@nestjs/common';

import { CORE_CONFIG, type CoreConfig } from '../config';
import { PrismaService } from '../prisma.service';
import { RegistryModule } from '../registry/registry.module';
import { ShellManifestController } from './shell-manifest.controller';
import { PRISMA } from './auth.module-tokens';
import { AuthService } from './auth.service';
import { InvitationsService } from './invitations.service';
import { SessionGuard, PermissionsGuard } from './guards';
import { AuthController } from './auth.controller';
import { AdminController } from './admin.controller';

@Module({
  imports: [RegistryModule],
  providers: [
    {
      provide: PRISMA,
      useFactory: (config: CoreConfig) => new PrismaService(config.databaseUrl),
      inject: [CORE_CONFIG],
    },
    {
      provide: AuthService,
      useFactory: (prisma: PrismaService, config: CoreConfig) =>
        new AuthService(prisma, config),
      inject: [PRISMA, CORE_CONFIG],
    },
    {
      provide: InvitationsService,
      useFactory: (prisma: PrismaService, auth: AuthService, config: CoreConfig) =>
        new InvitationsService(prisma, auth, config),
      inject: [PRISMA, AuthService, CORE_CONFIG],
    },
    SessionGuard,
    PermissionsGuard,
  ],
  controllers: [AuthController, AdminController, ShellManifestController],
  exports: [AuthService, PRISMA],
})
export class AuthModule {}
