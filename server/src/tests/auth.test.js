import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../utils/auth.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { registerSchema, loginSchema } from '../controllers/authController.js';

test('Auth Utils: Password hashing and comparison', async () => {
  const plain = 'SuperSecret123!';
  const hashed = await hashPassword(plain);

  assert.notEqual(hashed, plain, 'Hashed password should not equal plain text');
  assert.equal(typeof hashed, 'string');
  assert.ok(hashed.startsWith('$2'), 'Bcrypt hash should start with $2');

  const match = await comparePassword(plain, hashed);
  assert.equal(match, true, 'Valid password should match hash');

  const noMatch = await comparePassword('WrongPassword', hashed);
  assert.equal(noMatch, false, 'Invalid password should not match hash');
});

test('Auth Utils: JWT token generation and verification', () => {
  const userPayload = {
    id: 'usr-12345',
    email: 'test@luxestyle.com',
    role: 'STAFF',
    businessId: 'biz-999'
  };

  const token = generateToken(userPayload);
  assert.equal(typeof token, 'string');

  const decoded = verifyToken(token);
  assert.equal(decoded.id, userPayload.id);
  assert.equal(decoded.email, userPayload.email);
  assert.equal(decoded.role, userPayload.role);
  assert.equal(decoded.businessId, userPayload.businessId);
});

test('RBAC Middleware: requireRole enforcement', () => {
  const adminOnly = requireRole('ADMIN');

  // Case 1: No user attached -> 401
  let status1 = null;
  let json1 = null;
  const req1 = { user: null };
  const res1 = {
    status: (s) => { status1 = s; return { json: (j) => { json1 = j; } }; }
  };
  adminOnly(req1, res1, () => {});
  assert.equal(status1, 401);
  assert.equal(json1.error.code, 'UNAUTHORIZED');

  // Case 2: User is CUSTOMER -> 403 Forbidden
  let status2 = null;
  let json2 = null;
  const req2 = { user: { id: 'u1', role: 'CUSTOMER' } };
  const res2 = {
    status: (s) => { status2 = s; return { json: (j) => { json2 = j; } }; }
  };
  adminOnly(req2, res2, () => {});
  assert.equal(status2, 403);
  assert.equal(json2.error.code, 'FORBIDDEN');

  // Case 3: User is ADMIN -> next() called
  let nextCalled = false;
  const req3 = { user: { id: 'u2', role: 'ADMIN' } };
  const res3 = {};
  adminOnly(req3, res3, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('Validation Schemas: Register and Login input validation', () => {
  // Invalid email
  const badEmail = registerSchema.safeParse({
    email: 'not-an-email',
    password: 'password123',
    fullName: 'Jane Doe'
  });
  assert.equal(badEmail.success, false);

  // Short password (< 8 chars)
  const shortPass = registerSchema.safeParse({
    email: 'valid@example.com',
    password: 'short',
    fullName: 'Jane Doe'
  });
  assert.equal(shortPass.success, false);

  // Valid registration payload
  const validReg = registerSchema.safeParse({
    email: 'valid@example.com',
    password: 'ValidPassword123!',
    fullName: 'Jane Doe',
    phone: '+1-555-0100',
    role: 'CUSTOMER'
  });
  assert.equal(validReg.success, true);
  assert.equal(validReg.data.role, 'CUSTOMER');

  // Valid login payload
  const validLog = loginSchema.safeParse({
    email: 'valid@example.com',
    password: 'ValidPassword123!'
  });
  assert.equal(validLog.success, true);
});
