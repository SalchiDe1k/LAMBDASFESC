'use strict';

const fc = require('fast-check');
const { SignJWT, importPKCS8 } = require('jose');
const { encryptJWT } = require('../../src/encryptor/jweEncryptor');
const {
  TEST_PRIVATE_KEY_PEM,
  TEST_PUBLIC_KEY_PEM,
  TEST_PRIVATE_KEY_ALT_PEM
} = require('../fixtures/testHelpers');

jest.mock('../../src/shared/keyStore', () => ({
  getKeys: jest.fn()
}));

const keyStore = require('../../src/shared/keyStore');
const { handler: encryptHandler } = require('../../src/encryptor/handler');
const { handler: decryptHandler } = require('../../src/decryptor/handler');

beforeEach(() => {
  keyStore.getKeys.mockResolvedValue({
    privateKeyPem: TEST_PRIVATE_KEY_PEM,
    publicKeyPem: TEST_PUBLIC_KEY_PEM
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

const validPayloadArb = fc.object({
  key: fc.string({ minLength: 1, maxLength: 20 }),
  values: [fc.string(), fc.integer(), fc.boolean()]
}).filter(obj => Object.keys(obj).length > 0);

// Generador: strings que NO tienen exactamente 4 puntos separadores
const invalidJweStringArb = fc.string().filter(s => s.split('.').length !== 5);

describe('Property 1: Round-trip end-to-end preserva los claims originales', () => {
  it('encriptar y luego desencriptar retorna los mismos claims', async () => {
    await fc.assert(
      fc.asyncProperty(validPayloadArb, async (payload) => {
        const encryptResult = await encryptHandler({ body: JSON.stringify({ payload }) });
        expect(encryptResult.statusCode).toBe(200);

        const { jwe } = JSON.parse(encryptResult.body);
        const decryptResult = await decryptHandler({ body: JSON.stringify({ jwe }) });
        expect(decryptResult.statusCode).toBe(200);

        const { claims } = JSON.parse(decryptResult.body);
        for (const [key, value] of Object.entries(payload)) {
          expect(claims[key]).toEqual(value);
        }
      }),
      { numRuns: 30 }
    );
  });
});

describe('Property 6: JWEs con formato inválido producen HTTP 400', () => {
  it('para cualquier string sin formato compacto, handler retorna 400', async () => {
    await fc.assert(
      fc.asyncProperty(invalidJweStringArb, async (invalidJwe) => {
        const event = { body: JSON.stringify({ jwe: invalidJwe }) };
        const result = await decryptHandler(event);
        expect(result.statusCode).toBe(400);
      }),
      { numRuns: 50 }
    );
  });
});

describe('Property 7: JWTs con firma inválida producen HTTP 401', () => {
  it('JWT firmado con clave incorrecta produce 401 en decryptor', async () => {
    await fc.assert(
      fc.asyncProperty(validPayloadArb, async (payload) => {
        // Firmar con clave alternativa, encriptar con clave pública correcta
        const privateKeyAlt = await importPKCS8(TEST_PRIVATE_KEY_ALT_PEM, 'RS256');
        const jwt = await new SignJWT(payload)
          .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
          .setIssuedAt()
          .setExpirationTime('1h')
          .sign(privateKeyAlt);

        const jwe = await encryptJWT(jwt, TEST_PUBLIC_KEY_PEM);
        const result = await decryptHandler({ body: JSON.stringify({ jwe }) });
        expect(result.statusCode).toBe(401);
      }),
      { numRuns: 20 }
    );
  });
});
