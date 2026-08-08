import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Precedencia: entorno real > .env de la raíz del monorepo > .env local.
for (const candidate of [resolve(__dirname, '../../.env'), resolve(__dirname, '.env')]) {
  if (existsSync(candidate)) loadDotenv({ path: candidate, override: false });
}

// Prisma 7: la URL de conexión vive aquí (CLI/Migrate) y en el adapter del
// PrismaClient (runtime), ya no en schema.prisma.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
