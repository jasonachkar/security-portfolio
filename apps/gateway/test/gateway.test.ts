import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApp } from '../src/app.js';
import { isUpstreamAllowed } from '../src/proxy.js';

async function loginAs(username: string, password: string, rateLimitMax = 50) {
  const ctx = await createApp({ rateLimitMax });
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { username, password },
  });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  const cookie = response.cookies.find((item) => item.name === 'refreshToken');
  assert.ok(cookie);
  return { ...ctx, accessToken: body.accessToken as string, refreshToken: cookie.value as string };
}

describe('gateway auth and controls', () => {
  it('logs in with valid local credentials', async () => {
    const { app, accessToken } = await loginAs('admin', 'Admin123!');
    assert.ok(accessToken);
    await app.close();
  });

  it('rejects invalid credentials and emits an audit event', async () => {
    const { app, audit } = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'WrongPassword!' },
    });
    assert.equal(response.statusCode, 401);
    assert.equal(audit.list()[0]?.action, 'auth.login_failed');
    await app.close();
  });

  it('refreshes and rotates refresh tokens', async () => {
    const { app, refreshToken } = await loginAs('admin', 'Admin123!');
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    assert.equal(response.statusCode, 200);
    assert.ok(response.json().accessToken);
    const cookie = response.cookies.find((item) => item.name === 'refreshToken');
    assert.ok(cookie);
    assert.notEqual(cookie.value, refreshToken);
    await app.close();
  });

  it('detects refresh token reuse and revokes the family', async () => {
    const { app, audit, refreshToken } = await loginAs('admin', 'Admin123!');
    const firstRefresh = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    assert.equal(firstRefresh.statusCode, 200);

    const reuse = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    assert.equal(reuse.statusCode, 401);
    assert.equal(audit.list()[0]?.action, 'auth.refresh_reuse_detected');
    await app.close();
  });

  it('logs out and rejects the revoked refresh token', async () => {
    const { app, refreshToken } = await loginAs('admin', 'Admin123!');
    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken },
    });
    assert.equal(logout.statusCode, 204);

    const refresh = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    assert.equal(refresh.statusCode, 401);
    await app.close();
  });

  it('denies RBAC-protected audit access to analyst', async () => {
    const { app, accessToken } = await loginAs('analyst', 'Analyst123!');
    const response = await app.inject({
      method: 'GET',
      url: '/admin/audit-events',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(response.statusCode, 403);
    await app.close();
  });

  it('enforces request validation', async () => {
    const { app } = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin' },
    });
    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it('enforces rate limits', async () => {
    const { app } = await createApp({ rateLimitMax: 2, rateLimitWindowMs: 60_000 });
    await app.inject({ method: 'GET', url: '/gateway/services' });
    await app.inject({ method: 'GET', url: '/gateway/services' });
    const limited = await app.inject({ method: 'GET', url: '/gateway/services' });
    assert.equal(limited.statusCode, 429);
    await app.close();
  });

  it('rejects non-allowlisted upstreams', async () => {
    assert.equal(isUpstreamAllowed('http://169.254.169.254/latest', ['localhost']), false);
  });

  it('emits audit events for successful scan proxy attempts', async () => {
    const { app, audit, accessToken } = await loginAs('admin', 'Admin123!');
    const response = await app.inject({
      method: 'GET',
      url: '/api/scans',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(response.statusCode, 500);
    assert.equal(audit.list()[0]?.action, 'gateway.proxy_scanner');
    await app.close();
  });
});
