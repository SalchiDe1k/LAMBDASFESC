'use strict';

const {
  AppError,
  ValidationError,
  KeyStoreError,
  DecryptionError,
  SignatureError,
  TokenExpiredError
} = require('../../../src/shared/errors');

describe('AppError', () => {
  it('debe establecer el mensaje y statusCode correctamente', () => {
    const err = new AppError('algo falló', 503);
    expect(err.message).toBe('algo falló');
    expect(err.statusCode).toBe(503);
  });

  it('debe ser instancia de Error', () => {
    const err = new AppError('test', 500);
    expect(err).toBeInstanceOf(Error);
  });

  it('debe establecer la propiedad name al nombre de la clase', () => {
    const err = new AppError('test', 500);
    expect(err.name).toBe('AppError');
  });
});

describe('ValidationError', () => {
  it('debe tener statusCode 400', () => {
    const err = new ValidationError('campo inválido');
    expect(err.statusCode).toBe(400);
  });

  it('debe propagar el mensaje correctamente', () => {
    const err = new ValidationError('campo inválido');
    expect(err.message).toBe('campo inválido');
  });

  it('debe ser instancia de AppError y de Error', () => {
    const err = new ValidationError('campo inválido');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('debe tener name igual a "ValidationError"', () => {
    const err = new ValidationError('campo inválido');
    expect(err.name).toBe('ValidationError');
  });
});

describe('KeyStoreError', () => {
  it('debe tener statusCode 500', () => {
    const err = new KeyStoreError('fallo en secrets manager');
    expect(err.statusCode).toBe(500);
  });

  it('debe propagar el mensaje correctamente', () => {
    const err = new KeyStoreError('fallo en secrets manager');
    expect(err.message).toBe('fallo en secrets manager');
  });

  it('debe ser instancia de AppError y de Error', () => {
    const err = new KeyStoreError('fallo en secrets manager');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('debe tener name igual a "KeyStoreError"', () => {
    const err = new KeyStoreError('fallo en secrets manager');
    expect(err.name).toBe('KeyStoreError');
  });
});

describe('DecryptionError', () => {
  it('debe tener statusCode 422', () => {
    const err = new DecryptionError('no se pudo desencriptar');
    expect(err.statusCode).toBe(422);
  });

  it('debe propagar el mensaje correctamente', () => {
    const err = new DecryptionError('no se pudo desencriptar');
    expect(err.message).toBe('no se pudo desencriptar');
  });

  it('debe ser instancia de AppError y de Error', () => {
    const err = new DecryptionError('no se pudo desencriptar');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('debe tener name igual a "DecryptionError"', () => {
    const err = new DecryptionError('no se pudo desencriptar');
    expect(err.name).toBe('DecryptionError');
  });
});

describe('SignatureError', () => {
  it('debe tener statusCode 401', () => {
    const err = new SignatureError('firma inválida');
    expect(err.statusCode).toBe(401);
  });

  it('debe propagar el mensaje correctamente', () => {
    const err = new SignatureError('firma inválida');
    expect(err.message).toBe('firma inválida');
  });

  it('debe ser instancia de AppError y de Error', () => {
    const err = new SignatureError('firma inválida');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('debe tener name igual a "SignatureError"', () => {
    const err = new SignatureError('firma inválida');
    expect(err.name).toBe('SignatureError');
  });
});

describe('TokenExpiredError', () => {
  it('debe tener statusCode 401', () => {
    const err = new TokenExpiredError('token expirado');
    expect(err.statusCode).toBe(401);
  });

  it('debe propagar el mensaje correctamente', () => {
    const err = new TokenExpiredError('token expirado');
    expect(err.message).toBe('token expirado');
  });

  it('debe ser instancia de AppError y de Error', () => {
    const err = new TokenExpiredError('token expirado');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('debe tener name igual a "TokenExpiredError"', () => {
    const err = new TokenExpiredError('token expirado');
    expect(err.name).toBe('TokenExpiredError');
  });
});
