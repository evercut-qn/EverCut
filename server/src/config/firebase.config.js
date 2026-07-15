import admin, { cert } from 'firebase-admin';
import config from './index.js';
import logger from '../utils/logger.js';

/**
 * Initialise Firebase Admin SDK (singleton).
 * The service-account credentials are read from environment variables.
 */
const initFirebase = () => {
  const apps = typeof admin.getApps === 'function' ? admin.getApps() : admin.apps;
  if (apps && apps.length > 0) {
    return admin;
  }

  try {
    const firebaseCredential = admin.credential?.cert
      ? admin.credential.cert({ ...config.firebase })
      : cert({ ...config.firebase });

    admin.initializeApp({
      credential: firebaseCredential,
    });

    logger.info('Firebase Admin SDK initialised', {
      projectId: config.firebase.projectId,
    });
  } catch (err) {
    logger.error('Firebase Admin SDK init failed', { error: err.message });
    throw err;
  }

  return admin;
};

export default initFirebase();
