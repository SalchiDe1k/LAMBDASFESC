'use strict';

const { SignJWT, importPKCS8 } = require('jose');
const { signJWT } = require('../../../src/encryptor/jwtSigner');
const { verifyJWT } = require('../../../src/decryptor/jwtVerifier');
const { SignatureError, TokenExpiredError } = require('../../../src/shared/errors');
const {
  TEST_PRIVATE_KEY_PEM,
  TEST_PUBLIC_KEY_PEM,
  TEST_PRIVATE_KEY_ALT_PEM
} = require('../../fixtures/testHelpers');

describe('jwtVerifier', () => {
  const samplePayload = { userId: 'user-123', role: 'admin' };

  describe('verifyJWT — happy path', () => {
    it('retorna { jwt, claims } para un JWT válido', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
      const result = await verifyJWT(jwt, TEST_PUBLIC_KEY_PEM);

      expect(result).toHaveProperty('jwt', jwt);
      expect(result).toHaveProperty('claims');
      expect(typeof result.claims).toBe('object');
    });

    it('los claims contienen los campos del payload original', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
      const { claims } = await verifyJWT(jwt, TEST_PUBLIC_KEY_PEM);

      expect(claims.userId).toBe(samplePayload.userId);
      expect(claims.role).toBe(samplePayload.role);
    });

    it('los claims contienen iat y exp', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
      const { claims } = await verifyJWT(jwt, TEST_PUBLIC_KEY_PEM);

      expect(typeof claims.iat).toBe('number');
      expect(typeof claims.exp).toBe('number');
    });

    it('el campo jwt del resultado es el string original', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
      const result = await verifyJWT(jwt, TEST_PUBLIC_KEY_PEM);

      expect(result.jwt).toBe(jwt);
    });
  });

  describe('verifyJWT — firma inválida', () => {
    it('lanza SignatureError cuando el JWT fue firmado con otra clave', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_ALT_PEM);
      await expect(verifyJWT(jwt, TEST_PUBLIC_KEY_PEM)).rejects.toThrow(SignatureError);
    });

    it('lanza SignatureError con statusCode 401', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_ALT_PEM);
      await expect(verifyJWT(jwt, TEST_PUBLIC_KEY_PEM)).rejects.toHaveProperty('statusCode', 401);
    });

    it('lanza SignatureError cuando el JWT está manipulado', async () => {
      const jwt = await signJWT(samplePayload, TEST_PRIVATE_KEY_PEM);
      const parts = jwt.split('.');
      // Alterar el payload (parte 2)
      parts[1] = Buffer.from(JSON.stringify({ userId: 'hacker', role: 'root' }))
        .toString('base64url');
      const tamperedJwt = parts.join('.');
      await expect(verifyJWT(tamperedJwt, TEST_PUBLIC_KEY_PEM)).rejects.toThrow(SignatureError);
    });
  });

  describe('verifyJWT — token expirado', () => {
    it('lanza TokenExpiredError para un JWT expirado', async () => {
      const privateKey = await importPKCS8(TEST_PRIVATE_KEY_PEM, 'RS256');
      const expiredJwt = await new SignJWT(samplePayload)
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
        .sign(privateKey);

      await expect(verifyJWT(expiredJwt, TEST_PUBLIC_KEY_PEM)).rejects.toThrow(TokenExpiredError);
    });

    it('lanza TokenExpiredError con statusCode 401', async () => {
      const privateKey = await importPKCS8(TEST_PRIVATE_KEY_PEM, 'RS256');
      const expiredJwt = await new SignJWT(samplePayload)
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
        .sign(privateKey);

      await expect(verifyJWT(expiredJwt, TEST_PUBLIC_KEY_PEM)).rejects.toHaveProperty('statusCode', 401);
    });
  });
});
