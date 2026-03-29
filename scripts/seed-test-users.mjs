import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

const TEST_USERS = [
  {
    email: "admin.test@monitordistribution.local",
    password: "Monitor#Admin123",
    role: "admin",
    displayName: "Test Admin",
  },
  {
    email: "operator.test@monitordistribution.local",
    password: "Monitor#Operator123",
    role: "operator",
    displayName: "Test Operator",
  },
  {
    email: "viewer.test@monitordistribution.local",
    password: "Monitor#Viewer123",
    role: "viewer",
    displayName: "Test Viewer",
  },
];

async function upsertTestUsers() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  const { projectId, clientEmail, privateKey } = getAdminConfig();

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

  const auth = getAuth(app);
  const db = getFirestore(app);

  const summary = [];

  for (const entry of TEST_USERS) {
    let userRecord;
    let action = "created";

    try {
      const existing = await auth.getUserByEmail(entry.email);
      userRecord = await auth.updateUser(existing.uid, {
        displayName: entry.displayName,
        password: entry.password,
        emailVerified: true,
        disabled: false,
      });
      action = "updated";
    } catch (error) {
      const code = error && typeof error === "object" ? error.code : "";
      if (code === "auth/user-not-found") {
        userRecord = await auth.createUser({
          email: entry.email,
          password: entry.password,
          displayName: entry.displayName,
          emailVerified: true,
          disabled: false,
        });
      } else {
        throw error;
      }
    }

    const existingClaims = userRecord.customClaims ?? {};
    await auth.setCustomUserClaims(userRecord.uid, {
      ...existingClaims,
      role: entry.role,
    });

    await db
      .collection("user_roles")
      .doc(userRecord.uid)
      .set(
        {
          role: entry.role,
          email: entry.email,
          updatedBy: "seed-test-users-script",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      );

    summary.push({
      email: entry.email,
      role: entry.role,
      uid: userRecord.uid,
      action,
      password: entry.password,
    });
  }

  console.log("\nTest users are ready:\n");
  console.table(summary);
}

upsertTestUsers().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to seed test users:", message);
  process.exitCode = 1;
});
