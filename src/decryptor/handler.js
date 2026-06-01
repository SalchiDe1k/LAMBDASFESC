'use strict';

const { validateDecryptInput } = require('./validator');
const keyStore = require('../shared/keyStore');
const { decryptJWE } = require('./jweDecryptor');
const { verifyJWT } = require('./jwtVerifier');
const { AppError } = require('../shared/errors');
const { jsonResponse, errorResponse } = require('../shared/httpResponse');

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

    return jsonResponse({ jwt: verifiedJwt, claims });
  } catch (err) {
    if (err instanceof AppError) {
      return errorResponse(err.message, err.statusCode);
    }

    return errorResponse('Error interno del servidor', 500);
  }
}

module.exports = { handler };
