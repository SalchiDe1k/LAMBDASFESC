'use strict';

const { compactDecrypt, decodeProtectedHeader } = require('jose');
const { importPKCS8 } = require('jose');
const { encryptJWT } = require('../../../src/encryptor/jweEncryptor');
const { TEST_PRIVATE_KEY_PEM, TEST_PUBLIC_KEY_PEM } = require('../../fixtures/testHelpers');

describe('jweEncryptor', () => {
  const sampleJwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTcwMDAwMDAwMH0.signature';

  describe('encryptJWT', () => {
    it('debe producir un JWE con exactamente 5 partes separadas por "."', async () => {
      const jwe = await encryptJWT(sampleJwt, TEST_PUBLIC_KEY_PEM);
      const parts = jwe.split('.');
      expect(parts).toHaveLength(5);
      // Cada parte debe ser no vacía
      parts.forEach(part => expect(part.length).toBeGreaterThan(0));
    });

    it('debe producir un JWE que puede ser desencriptado con la clave privada correspondiente', async () => {
      const jwe = await encryptJWT(sampleJwt, TEST_PUBLIC_KEY_PEM);
      const privateKey = await importPKCS8(TEST_PRIVATE_KEY_PEM, 'RSA-OAEP-256');
      const { plaintext } = await compactDecrypt(jwe, privateKey);
      const decryptedJwt = new TextDecoder().decode(plaintext);
      expect(decryptedJwt).toBe(sampleJwt);
    });

    it('debe producir un JWE cuyo header protegido contiene alg: RSA-OAEP-256 y enc: A256GCM', async () => {
      const jwe = await encryptJWT(sampleJwt, TEST_PUBLIC_KEY_PEM);
      const header = decodeProtectedHeader(jwe);
      expect(header.alg).toBe('RSA-OAEP-256');
      expect(header.enc).toBe('A256GCM');
    });

    it('debe encriptar un JWT real producido por jwtSigner', async () => {
      const { signJWT } = require('../../../src/encryptor/jwtSigner');
      const payload = { userId: 'abc123', role: 'admin' };
      const jwt = await signJWT(payload, TEST_PRIVATE_KEY_PEM);

      const jwe = await encryptJWT(jwt, TEST_PUBLIC_KEY_PEM);
      const parts = jwe.split('.');
      expect(parts).toHaveLength(5);

      // Verificar que el JWE contiene el JWT original
      const privateKey = await importPKCS8(TEST_PRIVATE_KEY_PEM, 'RSA-OAEP-256');
      const { plaintext } = await compactDecrypt(jwe, privateKey);
      const decryptedJwt = new TextDecoder().decode(plaintext);
      expect(decryptedJwt).toBe(jwt);
    });
  });
});
