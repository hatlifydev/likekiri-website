import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONTRACT_VERSION } from '../src/index';

test('el contrato declara la versión 1', () => {
  assert.equal(CONTRACT_VERSION, '1');
});
