'use strict';

const { signJWT } = require('../../../src/encryptor/jwtSigner');
const { TEST_PRIVATE_KEY_PEM, TEST_PUBLIC_KEY_PEM } = require('../../fixtures/testHelpers');
const { jwtVerify, decodeProtectedHeader, importSPKI } = require('jose');

describe('jwtSigner', () => {
  const samplePayload = { userId: 'user-123', role: 'admin' };

  describe('signJWT', () => {
    it('produce un JWT que puede ser verificado con la clave pública correspondiente', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
      const publicKey = await importSPKI(TEST_PUBLIC_KEY_PEM, 'RS256');

      const { payload } = await jwtVerify(jwt, publicKey, { algorithms: ['RS256'] });

      expect(payload).toBeDefined();
    });

    it('el header del JWT contiene alg: RS256 y typ: JWT', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
      const header = decodeProtectedHeader(jwt);

      expect(header.alg).toBe('RS256');
      expect(header.typ).toBe('JWT');
    });

    it('el payload del JWT contiene los claims estándar iat y exp', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
      const publicKey = await importSPKI(TEST_PUBLIC_KEY_PEM, 'RS256');

      const { payload } = await jwtVerify(jwt, publicKey, { algorithms: ['RS256'] });

      expect(typeof payload.iat).toBe('number');
      expect(payload.iat).toBeGreaterThan(0);
      expect(typeof payload.exp).toBe('number');
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('los claims del payload original están presentes en el JWT', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
      const publicKey = await importSPKI(TEST_PUBLIC_KEY_PEM, 'RS256');

      const { payload } = await jwtVerify(jwt, publicKey, { algorithms: ['RS256'] });

      expect(payload.userId).toBe(samplePayload.userId);
      expect(payload.role).toBe(samplePayload.role);
    });

    it('funciona con un payload vacío', async () => {
      const jwt = await signJWT({}, TEST_PRIVATE_KEY_PEM);
      const publicKey = await importSPKI(TEST_PUBLIC_KEY_PEM, 'RS256');

      const { payload } = await jwtVerify(jwt, publicKey, { algorithms: ['RS256'] });

      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('funciona con un payload con campos anidados', async () => {
      const nestedPayload = { user: { id: 'abc', roles: ['admin', 'user'] }, meta: { v: 1 } };
      const jwt = await signJWT(nestedPayload, TEST_PRIVATE_KEY_PEM);
      const publicKey = await importSPKI(TEST_PUBLIC_KEY_PEM, 'RS256');

      const { payload } = await jwtVerify(jwt, publicKey, { algorithms: ['RS256'] });

      expect(payload.user).toEqual(nestedPayload.user);
      expect(payload.meta).toEqual(nestedPayload.meta);
    });

    it('usa JWT_EXPIRATION del entorno cuando está definida', async () => {
      const originalEnv = process.env.JWT_EXPIRATION;
      process.env.JWT_EXPIRATION = '2h';

      try {
        const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
        const publicKey = await importSPKI(TEST_PUBLIC_KEY_PEM, 'RS256');

        const { payload } = await jwtVerify(jwt, publicKey, { algorithms: ['RS256'] });

        // Con 2h de expiración, exp - iat debe ser aproximadamente 7200 segundos
        const diff = payload.exp - payload.iat;
        expect(diff).toBeGreaterThanOrEqual(7190);
        expect(diff).toBeLessThanOrEqual(7210);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.JWT_EXPIRATION;
        } else {
          process.env.JWT_EXPIRATION = originalEnv;
        }
      }
    });
  });
});
