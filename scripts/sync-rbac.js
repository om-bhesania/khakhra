#!/usr/bin/env node
/* eslint-disable no-console */
// Sync RBAC_DEFINITION from src/utils/Constants.ts to Firestore
// Requirements:
// - Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path
// - npm i -D firebase-admin ts-node

require("ts-node/register");
const path = require("path");
const admin = require("firebase-admin");

async function loadRbac() {
  const constantsPath = path.resolve(__dirname, "../src/utils/Constants.ts");
  const mod = require(constantsPath);
  if (!mod || !mod.RBAC_DEFINITION) {
    throw new Error("RBAC_DEFINITION not found in src/utils/Constants.ts");
  }
  return mod.RBAC_DEFINITION;
}

function initAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } catch (e) {
      console.error("Failed to initialize firebase-admin. Ensure GOOGLE_APPLICATION_CREDENTIALS is set.");
      throw e;
    }
  }
  return admin.firestore();
}

async function main() {
  const rbac = await loadRbac();
  const db = initAdmin();

  // 1) Write roles collection (one doc per role)
  console.log("Syncing roles...");
  const rolesCol = db.collection("roles");
  for (const [role, def] of Object.entries(rbac)) {
    await rolesCol.doc(role).set(def, { merge: true });
  }

  // 2) Write permissions collection (one doc per module)
  console.log("Syncing permissions...");
  const permissionsCol = db.collection("permissions");
  const modules = Object.values(rbac).reduce((acc, roleDef) => {
    for (const [moduleKey, actions] of Object.entries(roleDef.module || {})) {
      acc[moduleKey] = Array.from(new Set([...(acc[moduleKey] || []), ...actions]));
    }
    return acc;
  }, {});
  for (const [moduleKey, actions] of Object.entries(modules)) {
    await permissionsCol.doc(moduleKey).set({ actions }, { merge: true });
  }

  // 3) Write merged RolesAndPermssions/default
  console.log("Syncing RolesAndPermssions/default...");
  await db.collection("RolesAndPermssions").doc("default").set(rbac, { merge: true });

  console.log("RBAC sync completed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


