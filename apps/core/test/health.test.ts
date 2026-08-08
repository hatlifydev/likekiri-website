import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HealthController } from '../src/health.controller';

test('el health check responde ok', () => {
  const controller = new HealthController();
  const report = controller.health();
  assert.equal(report.status, 'ok');
  assert.ok(report.uptime >= 0);
});
