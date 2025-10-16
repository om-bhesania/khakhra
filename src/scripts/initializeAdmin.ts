import { SYSTEM_MODULES, type ModulePermission } from "@/types/rbac";
import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getFirestore,
  setDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";

// -------------------------------
// Firebase Initialization
// -------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -------------------------------
// Default Permission Templates
// -------------------------------
const defaultPermissions: ModulePermission = {
  create: true,
  read: true,
  update: true,
  delete: true,
};

const restrictedPermissions: ModulePermission = {
  create: false,
  read: true,
  update: true,
  delete: false,
};

// -------------------------------
// Helper: Create Role Document
// -------------------------------
async function createRole(roleData: any) {
  const roleRef = doc(db, "roles", roleData.type); // deterministic ID prevents duplicates
  await setDoc(
    roleRef,
    {
      ...roleData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
  console.log(`✅ Created/Updated role: ${roleData.type}`);
  return roleRef.id;
}

// -------------------------------
// Helper: Create User + Permissions
// -------------------------------
async function createUserWithRole(
  email: string,
  password: string,
  roleId: string,
  roleType: string
) {
  try {
    console.log(`⚙️ Creating user ${email} with role ${roleType}...`);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Create master user data entry
    const masterUserData = {
      id: user.uid,
      email: user.email,
      displayName: email.split("@")[0],
      roleId,
      status: "active",
      permissions: {},
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
    };

    const userColRef = collection(db, "masterUserData");
    await addDoc(userColRef, masterUserData);

    console.log(`✅ Added masterUserData for: ${email}`);

    // Create permissions for all modules
    for (const moduleId of SYSTEM_MODULES) {
      const permissionRef = doc(db, "permissions", `${roleId}_${moduleId}`);
      await setDoc(
        permissionRef,
        {
          roleId,
          moduleId,
          permissions:
            roleType === "SUPER_ADMIN"
              ? defaultPermissions
              : moduleId.toString() === "roles"
              ? restrictedPermissions
              : defaultPermissions,
          updatedBy: user.uid,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    }

    console.log(`✅ Created permissions for ${roleType}: ${email}`);
    return user;
  } catch (error: any) {
    console.error(`❌ Error creating ${roleType} (${email}):`, error.message);
    throw error;
  }
}

// -------------------------------
// System Initialization
// -------------------------------
export async function initializeSystem() {
  try {
    console.log("🚀 Starting system initialization...");

    // Create base roles
    const superAdminRoleId = await createRole({
      name: "Super Admin",
      description: "Full system access with all permissions",
      type: "SUPER_ADMIN",
      isSystem: true,
    });

    const adminRoleId = await createRole({
      name: "Admin",
      description: "System administrator with limited role management",
      type: "ADMIN",
      isSystem: true,
    });

    await createRole({
      name: "Employee",
      description: "Standard user access",
      type: "EMPLOYEE",
      isSystem: true,
    });

    // Create users
    await createUserWithRole(
      "bhesaniaom@gmail.com",
      "Password@123",
      superAdminRoleId,
      "SUPER_ADMIN"
    );

    await createUserWithRole(
      "admin@gmail.com",
      "admin@123",
      adminRoleId,
      "ADMIN"
    );

    console.log("🎯 System initialization completed successfully!");
  } catch (error: any) {
    console.error("🔥 Error during system initialization:", error.message);
  } finally {
    await auth.signOut();
    console.log("👋 Signed out after initialization");
  }
}
