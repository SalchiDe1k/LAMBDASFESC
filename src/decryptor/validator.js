'use strict';

const { ValidationError } = require('../shared/errors');

/**
 * Valida el input del evento de la Decryption Lambda.
 *
 * @param {Object} event - Evento de API Gateway
 * @returns {string} JWE validado
 * @throws {ValidationError} si el JWE es inválido
 */
function validateDecryptInput(event) {
  let body;

  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    throw new ValidationError("El campo 'jwe' es requerido y debe ser un JWE en formato compacto");
  }

  if (!body || typeof body !== 'object') {
    throw new ValidationError("El campo 'jwe' es requerido y debe ser un JWE en formato compacto");
  }

  const { jwe } = body;

  if (typeof jwe !== 'string' || jwe.split('.').length !== 5) {
    throw new ValidationError("El campo 'jwe' es requerido y debe ser un JWE en formato compacto");
  }

  return jwe;
}

module.exports = { validateDecryptInput };
