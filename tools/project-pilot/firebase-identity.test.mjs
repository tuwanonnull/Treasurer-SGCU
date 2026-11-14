import test from 'node:test';
import assert from 'node:assert/strict';
import { assertProjectEmulators, createEmulatorIdentity } from './firebase-identity.mjs';

test('emulator adapter refuses missing, production or remote configuration before SDK initialization', () => {
  const expected = { GCLOUD_PROJECT: 'demo-project-pilot', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9197', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8187' };
  const previous = Object.fromEntries(Object.keys(expected).map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, expected); assert.doesNotThrow(assertProjectEmulators);
    for (const [key, bad] of [['GCLOUD_PROJECT', 'production-project'], ['FIREBASE_AUTH_EMULATOR_HOST', 'remote.example:9197'], ['FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080']]) {
      process.env[key] = bad; assert.throws(createEmulatorIdentity, /isolated local/);
      delete process.env[key]; assert.throws(createEmulatorIdentity, /isolated local/);
      process.env[key] = expected[key];
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
