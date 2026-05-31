'use strict';

const { TEST_PRIVATE_KEY_PEM, TEST_PUBLIC_KEY_PEM } = require('../../fixtures/testHelpers');
const { KeyStoreError } = require('../../../src/shared/errors');

// Mock keyStore before requiring handler
jest.mock('../../../src/shared/keyStore', () => ({
  getKeys: jest.fn()
}));

const keyStore = require('../../../src/shared/keyStore');
const { handler } = require('../../../src/encryptor/handler');

beforeEach(() => {
  keyStore.getKeys.mockResolvedValue({
    privateKeyPem: TEST_PRIVATE_KEY_PEM,
    publicKeyPem: TEST_PUBLIC_KEY_PEM
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Encryption Lambda handler', () => {
  describe('respuestas exitosas', () => {
    it('retorna HTTP 200 con campo jwe para un payload válido', async () => {
      const event = { body: JSON.stringify({ payload: { userId: 'abc', role: 'admin' } }) };
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.jwe).toBeDefined();
      expect(typeof body.jwe).toBe('string');
      // JWE compacto tiene 5 partes
      expect(body.jwe.split('.').length).toBe(5);
    });

    it('retorna Content-Type application/json en los headers', async () => {
      const event = { body: JSON.stringify({ payload: { x: 1 } }) };
      const result = await handler(event);
      expect(result.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('validación de input — HTTP 400', () => {
    it('retorna HTTP 400 cuando payload está ausente', async () => {
      const event = { body: JSON.stringify({}) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toMatch(/payload/i);
    });

    it('retorna HTTP 400 cuando payload es un string', async () => {
      const event = { body: JSON.stringify({ payload: 'texto' }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('retorna HTTP 400 cuando payload es un número', async () => {
      const event = { body: JSON.stringify({ payload: 42 }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('retorna HTTP 400 cuando payload es un array', async () => {
      const event = { body: JSON.stringify({ payload: [1, 2, 3] }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('retorna HTTP 400 cuando payload es null', async () => {
      const event = { body: JSON.stringify({ payload: null }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('retorna HTTP 400 cuando payload es un booleano', async () => {
      const event = { body: JSON.stringify({ payload: true }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('retorna HTTP 400 cuando body es JSON inválido', async () => {
      const event = { body: 'not-json' };
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });
  });

  describe('errores de Key Store — HTTP 500', () => {
    it('retorna HTTP 500 cuando keyStore.getKeys() lanza KeyStoreError', async () => {
      keyStore.getKeys.mockRejectedValue(
        new KeyStoreError('Error al recuperar la clave de firma del Key Store')
      );
      const event = { body: JSON.stringify({ payload: { userId: 'abc' } }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBeDefined();
    });

    it('retorna HTTP 500 para errores inesperados sin exponer detalles', async () => {
      keyStore.getKeys.mockRejectedValue(new Error('Error interno inesperado'));
      const event = { body: JSON.stringify({ payload: { userId: 'abc' } }) };
      const result = await handler(event);
      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).not.toContain('interno inesperado');
    });
  });
});
