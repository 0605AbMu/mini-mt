'use strict';

const axios = require('axios').default;

const BASE_URL = 'http://localhost:3000';

// ── Shared state (persists across all describe blocks via module scope) ──
const state = {
  adminAccessToken:  null,
  adminRefreshToken: null,
  adminUserId:       null,
  userAccessToken:   null,
  userRefreshToken:  null,
  userId:            null,
  tenantId:          null,
  postId:            null,
  cleanupToken:      null,
};

// Unique seed per test run
const seed       = Date.now();
const adminEmail = `admin_${seed}@test.com`;
const userEmail  = `user_${seed}@test.com`;
const password   = 'Test@1234';
const tenantSlug = `tenant-${seed}`;

// ── HTTP helper ──────────────────────────────────────────────────────────
async function api(method, path, { body, token, tenantId } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token)    headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-Id']   = String(tenantId);

  const res = await axios({
    method,
    url: `${BASE_URL}${path}`,
    data: body,
    headers,
    validateStatus: () => true,
  });

  return { status: res.status, body: res.data };
}

// ── Custom status assertion ───────────────────────────────────────────────
function expectStatus(res, expected) {
  expect(res.status).toBe(expected);
}

// ════════════════════════════════════════════════════════════════════════
//  1. HEALTH
// ════════════════════════════════════════════════════════════════════════
describe('Health', () => {
  test('GET /health → 200 OK', async () => {
    const res = await api('GET', '/health');
    expectStatus(res, 200);
    expect(res.body.status).toBe('OK');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });
});

// ════════════════════════════════════════════════════════════════════════
//  2. AUTH — Register
// ════════════════════════════════════════════════════════════════════════
describe('Auth — Register', () => {
  test('registers admin user → 201', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { email: adminEmail, password, name: 'Test Admin', role: 'ADMIN' },
    });
    expectStatus(res, 201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('user');
    state.adminAccessToken  = res.body.accessToken;
    state.adminRefreshToken = res.body.refreshToken;
    state.adminUserId       = res.body.user.id;
  });

  test('registers regular user → 201', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { email: userEmail, password, name: 'Test User', role: 'USER' },
    });
    expectStatus(res, 201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    state.userAccessToken  = res.body.accessToken;
    state.userRefreshToken = res.body.refreshToken;
    state.userId           = res.body.user.id;
  });

  test('duplicate email → 409', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { email: adminEmail, password, name: 'Dupe' },
    });
    expectStatus(res, 409);
  });

  test('weak password → 400', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { email: `weak_${seed}@test.com`, password: '123', name: 'Weak' },
    });
    expectStatus(res, 400);
    expect(res.body).toHaveProperty('details');
  });

  test('invalid email format → 400', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { email: 'not-an-email', password, name: 'Bad' },
    });
    expectStatus(res, 400);
  });

  test('missing required fields → 400', async () => {
    const res = await api('POST', '/api/auth/register', { body: {} });
    expectStatus(res, 400);
  });
});

// ════════════════════════════════════════════════════════════════════════
//  3. AUTH — Login
// ════════════════════════════════════════════════════════════════════════
describe('Auth — Login', () => {
  test('valid credentials → 200 with tokens', async () => {
    const res = await api('POST', '/api/auth/login', {
      body: { email: adminEmail, password },
    });
    expectStatus(res, 200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('user');
    state.adminAccessToken  = res.body.accessToken;
    state.adminRefreshToken = res.body.refreshToken;
  });

  test('wrong password → 401', async () => {
    const res = await api('POST', '/api/auth/login', {
      body: { email: adminEmail, password: 'Wrong@Pass1' },
    });
    expectStatus(res, 401);
  });

  test('unknown email → 401', async () => {
    const res = await api('POST', '/api/auth/login', {
      body: { email: `ghost_${seed}@test.com`, password },
    });
    expectStatus(res, 401);
  });

  test('empty body → 400', async () => {
    const res = await api('POST', '/api/auth/login', { body: {} });
    expectStatus(res, 400);
  });
});

// ════════════════════════════════════════════════════════════════════════
//  4. AUTH — Me & Sessions
// ════════════════════════════════════════════════════════════════════════
describe('Auth — Me & Sessions', () => {
  test('GET /api/auth/me with valid token → 200', async () => {
    const res = await api('GET', '/api/auth/me', { token: state.adminAccessToken });
    expectStatus(res, 200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('email');
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('GET /api/auth/me without token → 401', async () => {
    const res = await api('GET', '/api/auth/me');
    expectStatus(res, 401);
  });

  test('GET /api/auth/sessions → 200 array', async () => {
    const res = await api('GET', '/api/auth/sessions', { token: state.adminAccessToken });
    expectStatus(res, 200);
    expect(res.body).toHaveProperty('sessions');
    expect(Array.isArray(res.body.sessions)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
//  5. AUTH — Refresh Token
// ════════════════════════════════════════════════════════════════════════
describe('Auth — Refresh Token', () => {
  test('valid refresh token → 200 new token pair', async () => {
    const res = await api('POST', '/api/auth/refresh', {
      body: { refreshToken: state.adminRefreshToken },
    });
    expectStatus(res, 200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    state.adminAccessToken  = res.body.accessToken;
    state.adminRefreshToken = res.body.refreshToken;
  });

  test('invalid refresh token → 401', async () => {
    const res = await api('POST', '/api/auth/refresh', {
      body: { refreshToken: 'totally-invalid-token-xyz' },
    });
    expectStatus(res, 401);
  });

  test('missing refresh token → 400', async () => {
    const res = await api('POST', '/api/auth/refresh', { body: {} });
    expectStatus(res, 400);
  });
});

// ════════════════════════════════════════════════════════════════════════
//  6. TENANTS — CRUD
// ════════════════════════════════════════════════════════════════════════
describe('Tenants — CRUD', () => {
  test('POST /api/tenants → create → 201', async () => {
    const res = await api('POST', '/api/tenants', {
      token: state.adminAccessToken,
      body: { name: `Tenant ${seed}`, slug: tenantSlug, description: 'Test tenant' },
    });
    expectStatus(res, 201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.slug).toBe(tenantSlug);
    state.tenantId = res.body.id;
  });

  test('POST /api/tenants → duplicate slug → 409', async () => {
    const res = await api('POST', '/api/tenants', {
      token: state.adminAccessToken,
      body: { name: 'Another name', slug: tenantSlug },
    });
    expectStatus(res, 409);
  });

  test('POST /api/tenants → invalid slug (uppercase) → 400', async () => {
    const res = await api('POST', '/api/tenants', {
      token: state.adminAccessToken,
      body: { name: 'Bad Slug', slug: 'UPPER_CASE' },
    });
    expectStatus(res, 400);
  });

  test('POST /api/tenants → missing name → 400', async () => {
    const res = await api('POST', '/api/tenants', {
      token: state.adminAccessToken,
      body: { slug: `only-slug-${seed}` },
    });
    expectStatus(res, 400);
  });

  test('GET /api/tenants → list → 200', async () => {
    const res = await api('GET', '/api/tenants', { token: state.adminAccessToken });
    expectStatus(res, 200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/tenants → no token → 401', async () => {
    const res = await api('GET', '/api/tenants');
    expectStatus(res, 401);
  });

  test('GET /api/tenants/:id → 200 with tenant data', async () => {
    const res = await api('GET', `/api/tenants/${state.tenantId}`, {
      token: state.adminAccessToken,
    });
    expectStatus(res, 200);
    expect(res.body.id).toBe(state.tenantId);
    expect(res.body.slug).toBe(tenantSlug);
  });

  test('GET /api/tenants/:id → not found → 404', async () => {
    const res = await api('GET', '/api/tenants/999999', { token: state.adminAccessToken });
    expectStatus(res, 404);
  });

  test('PUT /api/tenants/:id → update description → 200', async () => {
    const res = await api('PUT', `/api/tenants/${state.tenantId}`, {
      token: state.adminAccessToken,
      body: { description: 'Updated description' },
    });
    expectStatus(res, 200);
    expect(res.body.description).toBe('Updated description');
  });
});

// ════════════════════════════════════════════════════════════════════════
//  7. TENANTS — User Membership
// ════════════════════════════════════════════════════════════════════════
describe('Tenants — User Membership', () => {
  test('add admin to tenant → 201', async () => {
    const res = await api('POST', '/api/tenants/users', {
      token: state.adminAccessToken,
      body: { tenantId: state.tenantId, userId: state.adminUserId },
    });
    expectStatus(res, 201);
    expect(res.body).toHaveProperty('id');
  });

  test('add regular user to tenant → 201', async () => {
    const res = await api('POST', '/api/tenants/users', {
      token: state.adminAccessToken,
      body: { tenantId: state.tenantId, userId: state.userId },
    });
    expectStatus(res, 201);
  });

  test('duplicate membership → 409', async () => {
    const res = await api('POST', '/api/tenants/users', {
      token: state.adminAccessToken,
      body: { tenantId: state.tenantId, userId: state.adminUserId },
    });
    expectStatus(res, 409);
  });

  test('non-existent user → 404 or 400', async () => {
    const res = await api('POST', '/api/tenants/users', {
      token: state.adminAccessToken,
      body: { tenantId: state.tenantId, userId: 999999 },
    });
    expect([400, 404]).toContain(res.status);
  });

  test('non-admin cannot add users → 403', async () => {
    const res = await api('POST', '/api/tenants/users', {
      token: state.userAccessToken,
      body: { tenantId: state.tenantId, userId: state.userId },
    });
    expectStatus(res, 403);
  });
});

// ════════════════════════════════════════════════════════════════════════
//  8. USERS
// ════════════════════════════════════════════════════════════════════════
describe('Users', () => {
  test('GET /api/users → all users as admin → 200', async () => {
    const res = await api('GET', '/api/users', { token: state.adminAccessToken });
    expectStatus(res, 200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/users with X-Tenant-Id → filtered list → 200', async () => {
    const res = await api('GET', '/api/users', {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
    });
    expectStatus(res, 200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/users as non-admin → 403', async () => {
    const res = await api('GET', '/api/users', { token: state.userAccessToken });
    expectStatus(res, 403);
  });

  test('GET /api/users without token → 401', async () => {
    const res = await api('GET', '/api/users');
    expectStatus(res, 401);
  });

  test('POST /api/users (deprecated) → 410', async () => {
    const res = await api('POST', '/api/users', {
      token: state.adminAccessToken,
      body: { email: 'x@x.com', password, name: 'X' },
    });
    expectStatus(res, 410);
  });
});

// ════════════════════════════════════════════════════════════════════════
//  9. POSTS
// ════════════════════════════════════════════════════════════════════════
describe('Posts — tenant-scoped', () => {
  test('GET /api/posts without X-Tenant-Id → 400', async () => {
    const res = await api('GET', '/api/posts', { token: state.adminAccessToken });
    expectStatus(res, 400);
  });

  test('GET /api/posts without token → 401', async () => {
    const res = await api('GET', '/api/posts', { tenantId: state.tenantId });
    expectStatus(res, 401);
  });

  test('GET /api/posts (empty) → 200 with posts array', async () => {
    const res = await api('GET', '/api/posts', {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
    });
    expectStatus(res, 200);
    expect(res.body).toHaveProperty('posts');
    expect(Array.isArray(res.body.posts)).toBe(true);
  });

  test('POST /api/posts → admin creates post → 201', async () => {
    const res = await api('POST', '/api/posts', {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
      body: { title: 'Hello Tenant', content: 'Test content', published: true },
    });
    expectStatus(res, 201);
    expect(res.body).toHaveProperty('post');
    expect(res.body.post).toHaveProperty('id');
    expect(res.body.post.title).toBe('Hello Tenant');
    state.postId = res.body.post.id;
  });

  test('POST /api/posts → missing title → 400', async () => {
    const res = await api('POST', '/api/posts', {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
      body: { content: 'No title' },
    });
    expectStatus(res, 400);
  });

  test('POST /api/posts → user not in tenant → 403', async () => {
    const isolatedSlug = `isolated-${seed}`;
    const t2 = await api('POST', '/api/tenants', {
      token: state.adminAccessToken,
      body: { name: `Isolated ${seed}`, slug: isolatedSlug },
    });
    const isolatedId = t2.body.id;
    await api('POST', '/api/tenants/users', {
      token: state.adminAccessToken,
      body: { tenantId: isolatedId, userId: state.adminUserId },
    });
    const res = await api('POST', '/api/posts', {
      token: state.userAccessToken,
      tenantId: isolatedId,
      body: { title: 'Forbidden', published: false },
    });
    expectStatus(res, 403);
  });

  test('POST /api/posts → regular user in tenant → 201', async () => {
    const res = await api('POST', '/api/posts', {
      token: state.userAccessToken,
      tenantId: state.tenantId,
      body: { title: 'User Post', published: false },
    });
    expectStatus(res, 201);
    expect(res.body.post.title).toBe('User Post');
  });

  test('GET /api/posts → list with posts → 200', async () => {
    const res = await api('GET', '/api/posts', {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
    });
    expectStatus(res, 200);
    expect(res.body.posts.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/posts/:id → 200', async () => {
    const res = await api('GET', `/api/posts/${state.postId}`, {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
    });
    expectStatus(res, 200);
    expect(res.body.post.id).toBe(state.postId);
  });

  test('GET /api/posts/:id → not found → 404', async () => {
    const res = await api('GET', '/api/posts/999999', {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
    });
    expectStatus(res, 404);
  });

  test('PUT /api/posts/:id → author updates own post → 200', async () => {
    const res = await api('PUT', `/api/posts/${state.postId}`, {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
      body: { title: 'Updated Title', published: false },
    });
    expectStatus(res, 200);
    expect(res.body.post.title).toBe('Updated Title');
  });

  test('PUT /api/posts/:id → non-author cannot update → 403', async () => {
    const res = await api('PUT', `/api/posts/${state.postId}`, {
      token: state.userAccessToken,
      tenantId: state.tenantId,
      body: { title: 'Hijack' },
    });
    expectStatus(res, 403);
  });

  test('PUT /api/posts/:id → empty title → 400', async () => {
    const res = await api('PUT', `/api/posts/${state.postId}`, {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
      body: { title: '' },
    });
    expectStatus(res, 400);
  });

  test('DELETE /api/posts/:id → non-author cannot delete → 403', async () => {
    const res = await api('DELETE', `/api/posts/${state.postId}`, {
      token: state.userAccessToken,
      tenantId: state.tenantId,
    });
    expectStatus(res, 403);
  });

  test('DELETE /api/posts/:id → author deletes own post → 204', async () => {
    const res = await api('DELETE', `/api/posts/${state.postId}`, {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
    });
    expectStatus(res, 204);
  });

  test('DELETE /api/posts/:id → already deleted → 404', async () => {
    const res = await api('DELETE', `/api/posts/${state.postId}`, {
      token: state.adminAccessToken,
      tenantId: state.tenantId,
    });
    expectStatus(res, 404);
  });
});

// ════════════════════════════════════════════════════════════════════════
//  10. AUTH — Logout
// ════════════════════════════════════════════════════════════════════════
describe('Auth — Logout', () => {
  test('POST /api/auth/logout-all → invalidates all user sessions → 200', async () => {
    const res = await api('POST', '/api/auth/logout-all', { token: state.userAccessToken });
    expectStatus(res, 200);
  });

  test('GET /api/auth/me after logout-all → 401', async () => {
    const res = await api('GET', '/api/auth/me', { token: state.userAccessToken });
    expectStatus(res, 401);
  });

  test('POST /api/auth/logout with refreshToken → 200', async () => {
    const res = await api('POST', '/api/auth/logout', {
      body: { refreshToken: state.adminRefreshToken },
    });
    expectStatus(res, 200);
  });

  test('POST /api/auth/refresh after logout → 401', async () => {
    const res = await api('POST', '/api/auth/refresh', {
      body: { refreshToken: state.adminRefreshToken },
    });
    expectStatus(res, 401);
  });

  test('POST /api/auth/logout without refreshToken → 200', async () => {
    const res = await api('POST', '/api/auth/logout', { body: {} });
    expectStatus(res, 200);
  });
});

// ════════════════════════════════════════════════════════════════════════
//  11. TENANTS — Cleanup (needs fresh token since admin is logged out)
// ════════════════════════════════════════════════════════════════════════
describe('Tenants — Cleanup', () => {
  beforeAll(async () => {
    const res = await api('POST', '/api/auth/register', {
      body: {
        email: `cleanup_${seed}@test.com`,
        password,
        name: 'Cleanup Admin',
        role: 'ADMIN',
      },
    });
    state.cleanupToken = res.body.accessToken;
  });

  test('DELETE /api/tenants/:tenantId/users/:userId → remove user → 204', async () => {
    const res = await api(
      'DELETE',
      `/api/tenants/${state.tenantId}/users/${state.userId}`,
      { token: state.cleanupToken },
    );
    expectStatus(res, 204);
  });

  test('DELETE /api/tenants/:id → delete tenant → 204', async () => {
    const res = await api('DELETE', `/api/tenants/${state.tenantId}`, {
      token: state.cleanupToken,
    });
    expectStatus(res, 204);
  });

  test('DELETE /api/tenants/:id → already deleted → 404', async () => {
    const res = await api('DELETE', `/api/tenants/${state.tenantId}`, {
      token: state.cleanupToken,
    });
    expectStatus(res, 404);
  });
});

// ════════════════════════════════════════════════════════════════════════
//  12. 404 — Unknown routes
// ════════════════════════════════════════════════════════════════════════
describe('404 — Unknown routes', () => {
  test('GET /api/unknown → 404', async () => {
    const res = await api('GET', '/api/unknown');
    expectStatus(res, 404);
  });

  test('POST /api/auth/unknown → 404', async () => {
    const res = await api('POST', '/api/auth/unknown', { body: {} });
    expectStatus(res, 404);
  });

  test('DELETE /api/posts/unknown-route without token → 401', async () => {
    const res = await api('DELETE', '/api/posts/unknown-route');
    expectStatus(res, 401);
  });
});