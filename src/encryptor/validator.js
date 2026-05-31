'use strict';

const { ValidationError } = require('../shared/errors');

/**
 * Valida el input del evento de la Encryption Lambda.
 *
 * @param {Object} event - Evento de API Gateway
 * @returns {Object} payload validado
 * @throws {ValidationError} si el payload es inválido
 */
function validateEncryptInput(event) {
  let body;

  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    throw new ValidationError("El campo 'payload' es requerido y debe ser un objeto JSON válido");
  }

  if (!body || typeof body !== 'object') {
    throw new ValidationError("El campo 'payload' es requerido y debe ser un objeto JSON válido");
  }

  const { payload } = body;

  if (
    payload === undefined ||
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new ValidationError("El campo 'payload' es requerido y debe ser un objeto JSON válido");
  }

  return payload;
}

module.exports = { validateEncryptInput };
