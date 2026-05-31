'use strict';

const { compactDecrypt, importPKCS8 } = require('jose');
const { DecryptionError } = require('../shared/errors');

/**
 * Desencripta un JWE usando la clave privada RSA proporcionada.
 *
 * @param {string} jwe - JWE en formato compacto (5 partes separadas por '.')
 * @param {string} privateKeyPem - Clave privada RSA en formato PEM (PKCS#8)
 * @returns {Promise<string>} JWT desencriptado como string
 * @throws {DecryptionError} si el JWE no puede ser desencriptado
 */
async function decryptJWE(jwe, privateKeyPem) {
  try {
    const privateKey = await importPKCS8(privateKeyPem, 'RSA-OAEP-256');
    const { plaintext } = await compactDecrypt(jwe, privateKey);
    return new TextDecoder().decode(plaintext);
  } catch (err) {
    if (err instanceof DecryptionError) throw err;
    throw new DecryptionError(
      `Error al desencriptar el JWE: token inválido o clave incorrecta`
    );
  }
}

module.exports = { decryptJWE };
