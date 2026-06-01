'use strict';

const { KeyStoreError } = require('../../../src/shared/errors');

jest.mock('@aws-sdk/credential-providers', () => ({
  fromIni: jest.fn((options) => `ini:${options.profile}`)
}));

// Mock @aws-sdk/client-secrets-manager before requiring keyStore
jest.mock('@aws-sdk/client-secrets-manager', () => {
  const mockSend = jest.fn();
  const MockSecretsManagerClient = jest.fn().mockImplementation(() => ({
    send: mockSend,
  }));
  const MockGetSecretValueCommand = jest.fn().mockImplementation((input) => ({
    input,
  }));

  return {
    SecretsManagerClient: MockSecretsManagerClient,
    GetSecretValueCommand: MockGetSecretValueCommand,
    __mockSend: mockSend,
  };
});

// Retrieve the mock send function for use in tests
const { __mockSend: mockSend, SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');

// keyStore must be required AFTER the mock is set up
const { getKeys, clearCache } = require('../../../src/shared/keyStore');

const FAKE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nFAKE_PRIVATE\n-----END PRIVATE KEY-----';
const FAKE_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nFAKE_PUBLIC\n-----END PUBLIC KEY-----';

beforeEach(() => {
  clearCache();
  mockSend.mockReset();
  // Default: successful responses for both secrets
  mockSend
    .mockResolvedValueOnce({ SecretString: FAKE_PRIVATE_KEY })
    .mockResolvedValueOnce({ SecretString: FAKE_PUBLIC_KEY });

  delete process.env.AWS_PROFILE;
  process.env.AWS_REGION = 'us-east-1';
  process.env.PRIVATE_KEY_SECRET_NAME = 'alvaro-mejia/jwt-jwe/private-key';
  process.env.PUBLIC_KEY_SECRET_NAME = 'alvaro-mejia/jwt-jwe/public-key';
});

describe('keyStore.getKeys()', () => {
  test('retorna { privateKeyPem, publicKeyPem } en caso exitoso', async () => {
    const keys = await getKeys();

    expect(keys).toEqual({
      privateKeyPem: FAKE_PRIVATE_KEY,
      publicKeyPem: FAKE_PUBLIC_KEY,
    });
  });

  test('lanza KeyStoreError cuando Secrets Manager falla al recuperar la clave privada', async () => {
    mockSend.mockReset();
    mockSend.mockRejectedValueOnce(new Error('AccessDeniedException'));

    await expect(getKeys()).rejects.toThrow(KeyStoreError);
    await expect(getKeys()).rejects.toHaveProperty('statusCode', 500);
  });

  test('lanza KeyStoreError cuando Secrets Manager falla al recuperar la clave pública', async () => {
    mockSend.mockReset();
    mockSend
      .mockResolvedValueOnce({ SecretString: FAKE_PRIVATE_KEY })
      .mockRejectedValueOnce(new Error('ResourceNotFoundException'));

    await expect(getKeys()).rejects.toThrow(KeyStoreError);
    await expect(getKeys()).rejects.toHaveProperty('statusCode', 500);
  });

  test('el caché funciona: llamadas sucesivas solo invocan Secrets Manager una vez', async () => {
    const keys1 = await getKeys();
    const keys2 = await getKeys();
    const keys3 = await getKeys();

    // Secrets Manager debe haber sido llamado exactamente 2 veces (una por cada secreto)
    expect(mockSend).toHaveBeenCalledTimes(2);

    // Todas las llamadas retornan el mismo objeto cacheado
    expect(keys1).toBe(keys2);
    expect(keys2).toBe(keys3);
  });

  test('usa la región por defecto cuando AWS_REGION no está configurado', async () => {
    delete process.env.AWS_REGION;
    clearCache();

    await getKeys();

    expect(SecretsManagerClient).toHaveBeenCalledWith({ region: 'us-east-1' });
  });

  test('usa el perfil de AWS_PROFILE cuando está definido', async () => {
    process.env.AWS_PROFILE = 'alvaro-mejia';
    clearCache();

    await getKeys();

    expect(SecretsManagerClient).toHaveBeenCalledWith({
      region: 'us-east-1',
      credentials: 'ini:alvaro-mejia'
    });
  });

  test('clearCache() fuerza una nueva llamada a Secrets Manager en la siguiente invocación', async () => {
    // Primera llamada — usa Secrets Manager
    await getKeys();
    expect(mockSend).toHaveBeenCalledTimes(2);

    // Limpiar caché y preparar nuevas respuestas
    clearCache();
    mockSend
      .mockResolvedValueOnce({ SecretString: FAKE_PRIVATE_KEY })
      .mockResolvedValueOnce({ SecretString: FAKE_PUBLIC_KEY });

    // Segunda llamada — debe volver a llamar a Secrets Manager
    await getKeys();
    expect(mockSend).toHaveBeenCalledTimes(4);
  });

  test('el mensaje de KeyStoreError incluye el nombre del secreto fallido', async () => {
    mockSend.mockReset();
    mockSend.mockRejectedValueOnce(new Error('timeout'));

    try {
      await getKeys();
      fail('Debería haber lanzado KeyStoreError');
    } catch (err) {
      expect(err).toBeInstanceOf(KeyStoreError);
      expect(err.message).toContain('alvaro-mejia/jwt-jwe/private-key');
    }
  });
});
