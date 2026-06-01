'use strict';

const { ValidationError } = require('../shared/errors');
const { parseRequestBody, requireStringField } = require('../shared/requestParser');

/**
 * Valida el input del evento de la Decryption Lambda.
 *
 * @param {Object} event - Evento de API Gateway
 * @returns {string} JWE validado
 * @throws {ValidationError} si el JWE es inválido
 */
function validateDecryptInput(event) {
  const body = parseRequestBody(event.body, 'jwe');
  const jwe = requireStringField(body, 'jwe');

  if (jwe.split('.').length !== 5) {
    throw new ValidationError("El campo 'jwe' es requerido y debe ser un JWE en formato compacto");
  }

  return jwe;
}

module.exports = { validateDecryptInput };
