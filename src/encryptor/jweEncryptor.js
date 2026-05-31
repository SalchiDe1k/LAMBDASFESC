'use strict';

const { importSPKI, CompactEncrypt } = require('jose');

/**
 * Encripta un JWT como JWE usando la clave pública RSA proporcionada.
 *
 * @param {string} jwt - JWT firmado en formato compacto
 * @param {string} publicKeyPem - Clave pública RSA en formato PEM (SPKI)
 * @returns {Promise<string>} JWE en formato compacto (5 partes separadas por '.')
 */
async function encryptJWT(jwt, publicKeyPem) {
  const publicKey = await importSPKI(publicKeyPem, 'RSA-OAEP-256');

  const jwe = await new CompactEncrypt(new TextEncoder().encode(jwt))
    .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
    .encrypt(publicKey);

  return jwe;
}

module.exports = { encryptJWT };
