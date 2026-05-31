'use strict';

const { importPKCS8, SignJWT } = require('jose');

/**
 * Firma un JWT con la clave privada RSA proporcionada.
 *
 * @param {Object} payload - Claims del usuario a incluir en el JWT
 * @param {string} privateKeyPem - Clave privada RSA en formato PEM (PKCS#8)
 * @returns {Promise<string>} JWT firmado en formato compacto
 */
async function signJWT(payload, privateKeyPem) {
  const privateKey = await importPKCS8(privateKeyPem, 'RS256');

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRATION || '1h')
    .sign(privateKey);

  return jwt;
}

module.exports = { signJWT };
