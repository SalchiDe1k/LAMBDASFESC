'use strict';

const { ValidationError } = require('../shared/errors');
const { parseRequestBody, requireObjectField } = require('../shared/requestParser');

/**
 * Valida el input del evento de la Encryption Lambda.
 *
 * @param {Object} event - Evento de API Gateway
 * @returns {Object} payload validado
 * @throws {ValidationError} si el payload es inválido
 */
function validateEncryptInput(event) {
  const body = parseRequestBody(event.body, 'payload');
  return requireObjectField(body, 'payload');
}

module.exports = { validateEncryptInput };
