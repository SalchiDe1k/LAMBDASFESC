'use strict';

const {
  TEST_PRIVATE_KEY_PEM,
  TEST_PUBLIC_KEY_PEM,
  TEST_PRIVATE_KEY_ALT_PEM
} = require('../../fixtures/testHelpers');
const { KeyStoreError } = require('../../../src/shared/errors');
const { encryptJWT } = require('../../../src/encryptor/jweEncryptor');
const { signJWT } = require('../../../src/encryptor/jwtSigner');
const { importPKCS8 } = require('jose');
const { SignJWT } = require('jose');

jest.mock('../../../src/shared/keyStore', () => ({
  getKeys: jest.fn()
}));

const keyStore = require('../../../src/shared/keyStore');
const { handler } = require('../../../src/decryptor/handler');

beforeEach(() => {
  keyStore.getKeys.mockResolvedValue({
    privateKeyPem: TEST_PRIVATE_KEY_PEM,
    publicKeyPem: TEST_PUBLIC_KEY_PEM
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

async function makeValidJwe(payload = { userId: 'abc', role: 'admin' }) {
  const jwt = await signJWT(payload, TEST_PRIVATE_KEY_PEM);
  return encryptJWT(jwt, TEST_PUBLIC_KEY_PEM);
}

describe('Decryption Lambda handler', () => {
  describe('respuestas exitosas', () => {
    it('retorna HTTP 200 con campos jwt y claims para un JWE válido', async () => {
      const jwe = await makeValidJwe();
      const event = { body: JSON.stringify({ jwe }) };
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(typeof body.jwt).toBe('string');
      expect(body.jwt.split('.').length).toBe(3);
      expect(typeof body.claims).toBe('object');
    });

    it('los claims retornados contienen los campos del payload original', async () => {
      const payload = { userId: 'user-123', role: 'admin' };
      const jwe = await makeValidJwe(payload);
      const event = { body: JSON.stringify({ jwe }) };
      const result = await handler(event);

      const { claims } = JSON.parse(result.body);
      expect(claims.userId).toBe(payload.userId);
      expect(claims.role).toBe(payload.role);
    });

    it('retorna Content-Type application/json en los headers', async () => {
      const jwe = await makeValidJwe();
      const event = { body: JSON.stringify({ jwe }) };
      const result = await handler(event);

      expect(result.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('validación de input — HTTP 400', () => {
    it('retorna HTTP 400 cuando jwe está ausente', async () => {
      const event = { body: JSON.stringify({}) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toMatch(/jwe/i);
    });

    it('retorna HTTP 400 cuando jwe es un string sin formato compacto (menos de 5 partes)', async () => {
      const event = { body: JSON.stringify({ jwe: 'a.b.c.d' }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('retorna HTTP 400 cuando jwe tiene más de 5 partes', async () => {
      const event = { body: JSON.stringify({ jwe: 'a.b.c.d.e.f' }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('retorna HTTP 400 cuando jwe es null', async () => {
      const event = { body: JSON.stringify({ jwe: null }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('retorna HTTP 400 cuando jwe es un número', async () => {
      const event = { body: JSON.stringify({ jwe: 42 }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('retorna HTTP 400 cuando body es JSON inválido', async () => {
      const event = { body: 'not-json' };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });
  });

  describe('error de desencriptación — HTTP 422', () => {
    it('retorna HTTP 422 cuando el JWE está corrupto', async () => {
      const jwe = await makeValidJwe();
      const corruptJwe = jwe.slice(0, -10) + 'XXXXXXXXXXX';
      const event = { body: JSON.stringify({ jwe: corruptJwe }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(422);
    });

    it('retorna HTTP 422 cuando el JWE fue encriptado con otra clave pública', async () => {
      const jwt = await signJWT({ userId: 'abc' }, TEST_PRIVATE_KEY_PEM);
      // Encriptar con clave alternativa, pero el decryptor tiene la clave privada original
      const { TEST_PUBLIC_KEY_ALT_PEM } = require('../../fixtures/testHelpers');
      const wrongJwe = await encryptJWT(jwt, TEST_PUBLIC_KEY_ALT_PEM);
      const event = { body: JSON.stringify({ jwe: wrongJwe }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(422);
    });
  });

  describe('error de firma — HTTP 401', () => {
    it('retorna HTTP 401 cuando el JWT interno fue firmado con otra clave', async () => {
      // JWT firmado con clave alt, encriptado con clave pública correcta
      const jwt = await signJWT({ userId: 'abc' }, TEST_PRIVATE_KEY_ALT_PEM);
      const jwe = await encryptJWT(jwt, TEST_PUBLIC_KEY_PEM);
      const event = { body: JSON.stringify({ jwe }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(401);
    });

    it('retorna HTTP 401 cuando el JWT ha expirado', async () => {
      const privateKey = await importPKCS8(TEST_PRIVATE_KEY_PEM, 'RS256');
      const expiredJwt = await new SignJWT({ userId: 'abc' })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
        .sign(privateKey);

      const jwe = await encryptJWT(expiredJwt, TEST_PUBLIC_KEY_PEM);
      const event = { body: JSON.stringify({ jwe }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('errores de Key Store — HTTP 500', () => {
    it('retorna HTTP 500 cuando keyStore.getKeys() lanza KeyStoreError', async () => {
      keyStore.getKeys.mockRejectedValue(
        new KeyStoreError('Error al recuperar la clave de desencriptación del Key Store')
      );
      const jwe = await makeValidJwe();
      const event = { body: JSON.stringify({ jwe }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBeDefined();
    });

    it('retorna HTTP 500 para errores inesperados sin exponer detalles', async () => {
      keyStore.getKeys.mockRejectedValue(new Error('Error interno inesperado'));
      const jwe = await makeValidJwe();
      const event = { body: JSON.stringify({ jwe }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).not.toContain('interno inesperado');
    });
  });
});
