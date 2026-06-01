'use strict';

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { fromIni } = require('@aws-sdk/credential-providers');
const { KeyStoreError } = require('./errors');

let cachedKeys = null;
let cachedClient = null;

function buildAwsConfig() {
  const config = { region: process.env.AWS_REGION || 'us-east-1' };

  if (process.env.AWS_PROFILE) {
    config.credentials = fromIni({ profile: process.env.AWS_PROFILE });
  }

  return config;
}

function getClient() {
  if (!cachedClient) {
    cachedClient = new SecretsManagerClient(buildAwsConfig());
  }

  return cachedClient;
}

/**
 * Recupera un secreto de AWS Secrets Manager por nombre.
 * @param {string} secretName
 * @returns {Promise<string>} El valor del secreto como string
 * @throws {KeyStoreError} si el secreto no puede ser recuperado
 */
async function getSecret(secretName) {
  if (!secretName) {
    throw new KeyStoreError('Las variables de entorno PRIVATE_KEY_SECRET_NAME y PUBLIC_KEY_SECRET_NAME deben estar configuradas');
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await getClient().send(command);
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
 * Limpia el caché de claves y el cliente de AWS (usado en tests).
 */
function clearCache() {
  cachedKeys = null;
  cachedClient = null;
}

module.exports = { getKeys, clearCache };
