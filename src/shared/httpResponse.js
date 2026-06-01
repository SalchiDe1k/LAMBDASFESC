'use strict';

function jsonResponse(payload, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  };
}

function errorResponse(message, statusCode = 500) {
  return jsonResponse({ error: message }, statusCode);
}

module.exports = { jsonResponse, errorResponse };
