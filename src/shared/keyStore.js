'use strict';

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { KeyStoreError } = require('./errors');

// Caché a nivel de módulo — persiste entre invocaciones del mismo contenedor Lambda
let cachedKeys = null;

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

/**
 * Recupera un secreto de AWS Secrets Manager por nombre.
 * @param {string} secretName
 * @returns {Promise<string>} El valor del secreto como string
 * @throws {KeyStoreError} si el secreto no puede ser recuperado
 */
async function getSecret(secretName) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);
    return response.SecretString;
  } catch (err) {
    throw new KeyStoreError(
      `No se pudo recuperar el secreto '${secretName}': ${err.message}`
    );
  }
}

/**
 * Recupera y cachea las claves RSA desde AWS Secrets Manager.
 * El caché persiste durante el ciclo de vida del contenedor Lambda.
 *
 * @returns {Promise<{privateKeyPem: string, publicKeyPem: string}>}
 * @throws {KeyStoreError} si cualquier secreto no puede ser recuperado
 */
async function getKeys() {
  if (cachedKeys) {
    return cachedKeys;
  }

  const privateKeySecretName = process.env.PRIVATE_KEY_SECRET_NAME;
  const publicKeySecretName = process.env.PUBLIC_KEY_SECRET_NAME;

  const [privateKeyPem, publicKeyPem] = await Promise.all([
    getSecret(privateKeySecretName),
    getSecret(publicKeySecretName),
  ]);

  cachedKeys = { privateKeyPem, publicKeyPem };
  return cachedKeys;
}

/**
 * Limpia el caché de claves (usado en tests).
 */
function clearCache() {
  cachedKeys = null;
}

module.exports = { getKeys, clearCache };
