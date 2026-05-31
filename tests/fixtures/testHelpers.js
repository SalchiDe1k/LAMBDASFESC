'use strict';

const fs = require('fs');
const path = require('path');

const KEYS_DIR = path.join(__dirname, 'keys');

const TEST_PRIVATE_KEY_PEM = fs.readFileSync(
  path.join(KEYS_DIR, 'test-private.pem'),
  'utf8'
);

const TEST_PUBLIC_KEY_PEM = fs.readFileSync(
  path.join(KEYS_DIR, 'test-public.pem'),
  'utf8'
);

const TEST_PRIVATE_KEY_ALT_PEM = fs.readFileSync(
  path.join(KEYS_DIR, 'test-private-alt.pem'),
  'utf8'
);

const TEST_PUBLIC_KEY_ALT_PEM = fs.readFileSync(
  path.join(KEYS_DIR, 'test-public-alt.pem'),
  'utf8'
);

module.exports = {
  TEST_PRIVATE_KEY_PEM,
  TEST_PUBLIC_KEY_PEM,
  TEST_PRIVATE_KEY_ALT_PEM,
  TEST_PUBLIC_KEY_ALT_PEM
};
