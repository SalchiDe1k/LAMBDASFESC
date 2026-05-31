'use strict';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class KeyStoreError extends AppError {
  constructor(message) {
    super(message, 500);
  }
}

class DecryptionError extends AppError {
  constructor(message) {
    super(message, 422);
  }
}

class SignatureError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

class TokenExpiredError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

module.exports = {
  AppError,
  ValidationError,
  KeyStoreError,
  DecryptionError,
  SignatureError,
  TokenExpiredError
};
