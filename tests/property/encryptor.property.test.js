'use strict';

const fc = require('fast-check');
const { compactDecrypt, decodeProtectedHeader, importPKCS8, jwtVerify, importSPKI } = require('jose');
const {
  TEST_PRIVATE_KEY_PEM,
  TEST_PUBLIC_KEY_PEM
} = require('../fixtures/testHelpers');

jest.mock('../../src/shared/keyStore', () => ({
  getKeys: jest.fn()
}));

const keyStore = require('../../src/shared/keyStore');
const { handler } = require('../../src/encryptor/handler');

beforeEach(() => {
  keyStore.getKeys.mockResolvedValue({
    privateKeyPem: TEST_PRIVATE_KEY_PEM,
    publicKeyPem: TEST_PUBLIC_KEY_PEM
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

// Generador: objetos JSON con valores primitivos
const validPayloadArb = fc.object({
  key: fc.string({ minLength: 1, maxLength: 20 }),
  values: [fc.string(), fc.integer(), fc.boolean()]
}).filter(obj => Object.keys(obj).length > 0);

// Generador: valores que NO son objetos JSON válidos como payload
const invalidPayloadArb = fc.oneof(
  fc.constant(null),
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.array(fc.anything())
);

describe('Property 2: El JWE producido tiene formato compacto de cinco partes', () => {
  it('para cualquier payload JSON válido, jwe tiene exactamente 5 partes', async () => {
    await fc.assert(
      fc.asyncProperty(validPayloadArb, async (payload) => {
        const event = { body: JSON.stringify({ payload }) };
        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        const { jwe } = JSON.parse(result.body);
        expect(typeof jwe).toBe('string');
        expect(jwe.split('.').length).toBe(5);
        jwe.split('.').forEach(part => expect(part.length).toBeGreaterThan(0));
      }),
      { numRuns: 50 }
    );
  });
});

describe('Property 3: El JWT tiene los headers criptográficos correctos', () => {
  it('para cualquier payload válido, headers JWT y JWE son correctos', async () => {
    await fc.assert(
      fc.asyncProperty(validPayloadArb, async (payload) => {
        const event = { body: JSON.stringify({ payload }) };
        const result = await handler(event);

        const { jwe } = JSON.parse(result.body);
        const jweHeader = decodeProtectedHeader(jwe);
        expect(jweHeader.alg).toBe('RSA-OAEP-256');
        expect(jweHeader.enc).toBe('A256GCM');

        const privateKey = await importPKCS8(TEST_PRIVATE_KEY_PEM, 'RSA-OAEP-256');
        const { plaintext } = await compactDecrypt(jwe, privateKey);
        const jwt = new TextDecoder().decode(plaintext);
        const jwtHeader = decodeProtectedHeader(jwt);
        expect(jwtHeader.alg).toBe('RS256');
        expect(jwtHeader.typ).toBe('JWT');
      }),
      { numRuns: 30 }
    );
  });
});

describe('Property 4: El JWT contiene los claims estándar iat y exp', () => {
  it('para cualquier payload válido, el JWT contiene iat y exp', async () => {
    await fc.assert(
      fc.asyncProperty(validPayloadArb, async (payload) => {
        const event = { body: JSON.stringify({ payload }) };
        const result = await handler(event);

        const { jwe } = JSON.parse(result.body);
        const privateKey = await importPKCS8(TEST_PRIVATE_KEY_PEM, 'RSA-OAEP-256');
        const { plaintext } = await compactDecrypt(jwe, privateKey);
        const jwt = new TextDecoder().decode(plaintext);

        const publicKey = await importSPKI(TEST_PUBLIC_KEY_PEM, 'RS256');
        const { payload: claims } = await jwtVerify(jwt, publicKey, { algorithms: ['RS256'] });

        expect(typeof claims.iat).toBe('number');
        expect(claims.iat).toBeGreaterThan(0);
        expect(typeof claims.exp).toBe('number');
        expect(claims.exp).toBeGreaterThan(claims.iat);
      }),
      { numRuns: 30 }
    );
  });
});

describe('Property 5: Inputs de payload inválidos producen HTTP 400', () => {
  it('para cualquier valor no-objeto en payload, handler retorna 400', async () => {
    await fc.assert(
      fc.asyncProperty(invalidPayloadArb, async (invalidPayload) => {
        const event = { body: JSON.stringify({ payload: invalidPayload }) };
        const result = await handler(event);
        expect(result.statusCode).toBe(400);
      }),
      { numRuns: 50 }
    );
  });
});
