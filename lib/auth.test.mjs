import test from 'node:test';
import assert from 'node:assert';
import { verifyToken, signToken } from './auth.js';

test('auth.js verifyToken', async (t) => {
  await t.test('returns payload for a valid token', async () => {
    const payload = { id: 123, role: 'admin' };
    const token = await signToken(payload);
    const verified = await verifyToken(token);
    assert.strictEqual(verified.id, payload.id);
    assert.strictEqual(verified.role, payload.role);
  });

  await t.test('returns null for an invalid token', async () => {
    const invalidToken = 'this.is.not.a.valid.token';
    const verified = await verifyToken(invalidToken);
    assert.strictEqual(verified, null);
  });
});
