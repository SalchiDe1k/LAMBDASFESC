'use strict';

const { validateEncryptInput } = require('./validator');
const keyStore = require('../shared/keyStore');
const { signJWT } = require('./jwtSigner');
const { encryptJWT } = require('./jweEncryptor');
const { AppError } = require('../shared/errors');
const { jsonResponse, errorResponse } = require('../shared/httpResponse');

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

    return jsonResponse({ jwe });
  } catch (err) {
    if (err instanceof AppError) {
      return errorResponse(err.message, err.statusCode);
    }

    return errorResponse('Error interno del servidor', 500);
  }
}

module.exports = { handler };
