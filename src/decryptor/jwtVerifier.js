'use strict';

const { jwtVerify, importSPKI, errors: joseErrors } = require('jose');
const { SignatureError, TokenExpiredError } = require('../shared/errors');

/**
 * Verifica la firma de un JWT usando la clave pública RSA proporcionada.
 *
 * @param {string} jwt - JWT firmado en formato compacto
 * @param {string} publicKeyPem - Clave pública RSA en formato PEM (SPKI)
 * @returns {Promise<{jwt: string, claims: Object}>}
 * @throws {TokenExpiredError} si el token ha expirado
 * @throws {SignatureError} si la firma es inválida
 */
async function verifyJWT(jwt, publicKeyPem) {
  try {
    const publicKey = await importSPKI(publicKeyPem, 'RS256');
    const { payload } = await jwtVerify(jwt, publicKey, { algorithms: ['RS256'] });
    return { jwt, claims: payload };
  } catch (err) {
    if (err instanceof TokenExpiredError || err instanceof SignatureError) throw err;
    if (err.code === 'ERR_JWT_EXPIRED') {
      throw new TokenExpiredError('El token JWT ha expirado');
    }
    throw new SignatureError('Firma del JWT inválida');
  }
}

module.exports = { verifyJWT };
