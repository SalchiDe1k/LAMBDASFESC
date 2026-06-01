'use strict';

const { ValidationError } = require('./errors');

function parseRequestBody(rawBody, expectedField) {
  if (rawBody === undefined || rawBody === null) {
    return null;
  }

  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody);
    } catch {
      throw new ValidationError(`El campo '${expectedField}' es requerido y debe ser un JSON válido`);
    }
  }

  return rawBody;
}

function requireObjectField(body, fieldName) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError(`El campo '${fieldName}' es requerido y debe ser un objeto JSON válido`);
  }

  const value = body[fieldName];

  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`El campo '${fieldName}' es requerido y debe ser un objeto JSON válido`);
  }

  return value;
}

function requireStringField(body, fieldName) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError(`El campo '${fieldName}' es requerido y debe ser una cadena`);
  }

  const value = body[fieldName];

  if (typeof value !== 'string') {
    throw new ValidationError(`El campo '${fieldName}' es requerido y debe ser una cadena`);
  }

  return value;
}

module.exports = {
  parseRequestBody,
  requireObjectField,
  requireStringField
};
