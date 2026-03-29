import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getPrivateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) {
    return undefined;
  }
  return key.replace(/\\n/g, "\n");
}

function createServiceAccount(): ServiceAccount {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

function ensureAdminApp() {
  if (adminApp) {
    return adminApp;
  }

  adminApp =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert(createServiceAccount()),
        });

  return adminApp;
}

export function getAdminAuth() {
  if (!adminAuth) {
    adminAuth = getAuth(ensureAdminApp());
  }
  return adminAuth;
}

export function getAdminDb() {
  if (!adminDb) {
    adminDb = getFirestore(ensureAdminApp());
  }
  return adminDb;
}
