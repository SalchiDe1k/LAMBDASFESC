'use strict';

const { validateDecryptInput } = require('./validator');
const keyStore = require('../shared/keyStore');
const { decryptJWE } = require('./jweDecryptor');
const { verifyJWT } = require('./jwtVerifier');
const { AppError } = require('../shared/errors');

const HEADERS = { 'Content-Type': 'application/json' };

/**
 * Handler de la Decryption Lambda.
 * Recibe un JWE, lo desencripta y verifica la firma del JWT contenido.
 *
 * @param {Object} event - Evento de API Gateway
 * @returns {Object} Respuesta HTTP con { jwt, claims } o un error
 */
async function handler(event) {
  try {
    const jwe = validateDecryptInput(event);
    const { privateKeyPem, publicKeyPem } = await keyStore.getKeys();
    const jwt = await decryptJWE(jwe, privateKeyPem);
    const { jwt: verifiedJwt, claims } = await verifyJWT(jwt, publicKeyPem);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ jwt: verifiedJwt, claims })
    };
  } catch (err) {
    if (err instanceof AppError) {
      return {
        statusCode: err.statusCode,
        headers: HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }

    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
  }
}

module.exports = { handler };
