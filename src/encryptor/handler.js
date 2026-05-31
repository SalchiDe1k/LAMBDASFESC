'use strict';

const { validateEncryptInput } = require('./validator');
const keyStore = require('../shared/keyStore');
const { signJWT } = require('./jwtSigner');
const { encryptJWT } = require('./jweEncryptor');
const { AppError } = require('../shared/errors');

const HEADERS = { 'Content-Type': 'application/json' };

/**
 * Handler de la Encryption Lambda.
 * Recibe un payload JSON, firma un JWT y lo encripta como JWE.
 *
 * @param {Object} event - Evento de API Gateway
 * @returns {Object} Respuesta HTTP con el JWE o un error
 */
async function handler(event) {
  try {
    const payload = validateEncryptInput(event);
    const { privateKeyPem, publicKeyPem } = await keyStore.getKeys();
    const jwt = await signJWT(payload, privateKeyPem);
    const jwe = await encryptJWT(jwt, publicKeyPem);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ jwe })
    };
  } catch (err) {
    if (err instanceof AppError) {
      return {
        statusCode: err.statusCode,
        headers: HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }

    // Error inesperado — no exponer detalles internos
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
  }
}

module.exports = { handler };
