'use strict';

const { encryptJWT } = require('../../../src/encryptor/jweEncryptor');
const { signJWT } = require('../../../src/encryptor/jwtSigner');
const { decryptJWE } = require('../../../src/decryptor/jweDecryptor');
const { DecryptionError } = require('../../../src/shared/errors');
const {
  TEST_PRIVATE_KEY_PEM,
  TEST_PUBLIC_KEY_PEM,
  TEST_PRIVATE_KEY_ALT_PEM
} = require('../../fixtures/testHelpers');

describe('jweDecryptor', () => {
  let validJwe;
  let sampleJwt;

  beforeAll(async () => {
    sampleJwt = await signJWT({ userId: 'abc', role: 'admin' }, TEST_PRIVATE_KEY_PEM);
    validJwe = await encryptJWT(sampleJwt, TEST_PUBLIC_KEY_PEM);
  });

  describe('decryptJWE — happy path', () => {
    it('desencripta un JWE válido y retorna el JWT original', async () => {
      const result = await decryptJWE(validJwe, TEST_PRIVATE_KEY_PEM);
      expect(result).toBe(sampleJwt);
    });

    it('retorna un string', async () => {
      const result = await decryptJWE(validJwe, TEST_PRIVATE_KEY_PEM);
      expect(typeof result).toBe('string');
    });

    it('el JWT retornado tiene 3 partes separadas por "."', async () => {
      const result = await decryptJWE(validJwe, TEST_PRIVATE_KEY_PEM);
      expect(result.split('.').length).toBe(3);
    });
  });

  describe('decryptJWE — casos de error', () => {
    it('lanza DecryptionError cuando el JWE está corrupto', async () => {
      const corruptJwe = validJwe.slice(0, -10) + 'XXXXXXXXXXX';
      await expect(decryptJWE(corruptJwe, TEST_PRIVATE_KEY_PEM)).rejects.toThrow(DecryptionError);
    });

    it('lanza DecryptionError con statusCode 422 cuando el JWE está corrupto', async () => {
      const corruptJwe = validJwe.slice(0, -10) + 'XXXXXXXXXXX';
      await expect(decryptJWE(corruptJwe, TEST_PRIVATE_KEY_PEM)).rejects.toHaveProperty('statusCode', 422);
    });

    it('lanza DecryptionError cuando se usa la clave privada incorrecta', async () => {
      await expect(decryptJWE(validJwe, TEST_PRIVATE_KEY_ALT_PEM)).rejects.toThrow(DecryptionError);
    });

    it('lanza DecryptionError con statusCode 422 cuando se usa clave incorrecta', async () => {
      await expect(decryptJWE(validJwe, TEST_PRIVATE_KEY_ALT_PEM)).rejects.toHaveProperty('statusCode', 422);
    });

    it('el mensaje de error no expone detalles criptográficos internos', async () => {
      try {
        await decryptJWE('a.b.c.d.e', TEST_PRIVATE_KEY_PEM);
      } catch (err) {
        expect(err.message).toContain('Error al desencriptar el JWE');
      }
    });
  });
});
