// firebase.config.ts - Updated Firebase Configuration

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const {
  VITE_API_KEY,
  VITE_AUTH_DOMAIN,
  VITE_PROJECT_ID,
  VITE_STORAGE_BUCKET,
  VITE_MESSAGING_SENDER_ID,
  VITE_APP_ID,
} = import.meta.env;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: VITE_API_KEY,
  authDomain: VITE_AUTH_DOMAIN,
  projectId: VITE_PROJECT_ID,
  storageBucket: VITE_STORAGE_BUCKET,
  messagingSenderId: VITE_MESSAGING_SENDER_ID,
  appId: VITE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Enable Firestore offline persistence for caching and offline support
// This automatically caches all queried documents and reduces read operations
try {
  // Try to enable multi-tab persistence (recommended for better UX)
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      // Multiple tabs open, fallback to single-tab persistence
      console.warn(
        "Multi-tab persistence not available, using single-tab persistence"
      );
      enableIndexedDbPersistence(db).catch((persistenceErr) => {
        if (persistenceErr.code === "failed-precondition") {
          console.warn("Persistence failed: Multiple tabs open");
        } else if (persistenceErr.code === "unimplemented") {
          console.warn("Persistence not available in this browser");
        } else {
          console.error("Persistence error:", persistenceErr);
        }
      });
    } else if (err.code === "unimplemented") {
      // Browser doesn't support persistence
      console.warn("Persistence not available in this browser");
    } else {
      console.error("Multi-tab persistence error:", err);
    }
  });
  console.log("✅ Firestore offline persistence enabled");
} catch (error) {
  console.warn("Failed to enable Firestore persistence:", error);
}

// Initialize Firebase Authentication
const auth = getAuth(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Configure Google Provider settings
googleProvider.setCustomParameters({
  prompt: "select_account", // Forces account selection
});

export { app, db, auth, googleProvider };

// ============================================
// authService.ts - Authentication Functions
// ============================================

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  Timestamp,
  addDoc,
} from "firebase/firestore";

// Google Sign-In
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user document exists in Firestore, if not create one
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: "employee", // default role
        provider: "google",
        createdAt: new Date(),
      });
    }

    return user;
  } catch (error: any) {
    throw new Error(error.message || "Failed to sign in with Google");
  }
};

// Email/Password Sign-In
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    const errorMessage =
      error.code === "auth/user-not-found"
        ? "User not found"
        : error.code === "auth/wrong-password"
        ? "Incorrect password"
        : error.code === "auth/invalid-email"
        ? "Invalid email address"
        : error.code === "auth/user-disabled"
        ? "This account has been disabled"
        : error.code === "auth/invalid-credential"
        ? "Invalid email or password"
        : error.message || "Failed to sign in";
    throw new Error(errorMessage);
  }
};

// Generate slug from organization name
const generateOrgSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
};

// Email/Password Sign-Up
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
  organizationName?: string
): Promise<User> => {
  try {
    // Create user account
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Update Firebase Auth profile with display name
    await updateProfile(user, {
      displayName: displayName,
    });

    let organizationId: string | null = null;

    // Check if user is registering with an employee record (email match)
    const { collection, query, where, getDocs } = await import(
      "firebase/firestore"
    );
    const employeesQuery = query(
      collection(db, "employees"),
      where("email", "==", email.toLowerCase().trim())
    );
    const employeesSnapshot = await getDocs(employeesQuery);

    if (!employeesSnapshot.empty) {
      // User is registering with an employee email - link to employee record
      const employeeDoc = employeesSnapshot.docs[0];
      const employeeData = employeeDoc.data();
      organizationId = employeeData.organizationId || null;
    }

    // If user is registering as an employee (email matches employee record),
    // don't allow organization creation
    if (
      organizationName &&
      organizationName.trim() &&
      !employeesSnapshot.empty
    ) {
      throw new Error(
        "Cannot create organization. Your email is associated with an employee record. Please register without an organization name."
      );
    }

    // If organization name provided, create organization
    if (organizationName && organizationName.trim()) {
      const { SYSTEM_MODULES } = await import("@/types/rbac");

      const slug = generateOrgSlug(organizationName.trim());

      // Check if organization name already exists
      const orgsQuery = query(
        collection(db, "organizations"),
        where("slug", "==", slug)
      );
      const orgsSnapshot = await getDocs(orgsQuery);

      if (!orgsSnapshot.empty) {
        throw new Error(
          "Organization name already exists. Please choose a different name."
        );
      }

      // Create organization
      const orgData = {
        name: organizationName.trim(),
        slug: slug,
        ownerUid: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const orgRef = await addDoc(collection(db, "organizations"), orgData);
      organizationId = orgRef.id;

      // Create Owner role
      const ownerRole = {
        organizationId: orgRef.id,
        name: "Owner",
        description: "Organization owner with full access",
        isSystem: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
      };
      const ownerRoleRef = await addDoc(
        collection(db, `organizations/${orgRef.id}/roles`),
        ownerRole
      );
      const ownerRoleId = ownerRoleRef.id;

      // Create Owner permissions (full access)
      const fullPermissions = {
        create: true,
        read: true,
        update: true,
        delete: true,
      };

      for (const module of SYSTEM_MODULES) {
        await addDoc(collection(db, `organizations/${orgRef.id}/permissions`), {
          organizationId: orgRef.id,
          roleId: ownerRoleId,
          moduleId: module.id,
          permissions: fullPermissions,
          updatedBy: user.uid,
          updatedAt: Timestamp.now(),
        });
      }

      // Create Employee role with read-only permissions
      const employeeRole = {
        organizationId: orgRef.id,
        name: "Employee",
        description:
          "Default employee role with read-only access to all modules",
        isSystem: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
      };
      const employeeRoleRef = await addDoc(
        collection(db, `organizations/${orgRef.id}/roles`),
        employeeRole
      );
      const employeeRoleId = employeeRoleRef.id;

      // Create Employee permissions (read-only)
      const readOnlyPermissions = {
        create: false,
        read: true,
        update: false,
        delete: false,
      };

      for (const module of SYSTEM_MODULES) {
        await addDoc(collection(db, `organizations/${orgRef.id}/permissions`), {
          organizationId: orgRef.id,
          roleId: employeeRoleId,
          moduleId: module.id,
          permissions: readOnlyPermissions,
          updatedBy: user.uid,
          updatedAt: Timestamp.now(),
        });
      }

      // Add owner as member
      await addDoc(collection(db, `organizations/${orgRef.id}/members`), {
        userId: user.uid,
        roleId: ownerRoleId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else if (organizationId) {
      // User has employee record - add to organization members with Employee role
      // Get Employee role for this org
      const rolesQuery = query(
        collection(db, `organizations/${organizationId}/roles`),
        where("name", "==", "Employee"),
        where("isSystem", "==", true)
      );
      const rolesSnapshot = await getDocs(rolesQuery);

      if (!rolesSnapshot.empty) {
        const employeeRole = rolesSnapshot.docs[0];

        // Add user as member
        await addDoc(
          collection(db, `organizations/${organizationId}/members`),
          {
            userId: user.uid,
            roleId: employeeRole.id,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }
        );
      }

      // Update employee record with userId
      const employeeDoc = employeesSnapshot.docs[0];
      await updateDoc(employeeDoc.ref, {
        userId: user.uid,
        updatedAt: Timestamp.now(),
      });
    }

    // Store additional user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      displayName: displayName,
      photoURL: null,
      role: "employee", // default role
      provider: "email",
      organizationId: organizationId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      // Flag for password change on first login
      requiresPasswordChange: false,
    });

    return user;
  } catch (error: any) {
    const errorMessage =
      error.code === "auth/email-already-in-use"
        ? "Email already in use"
        : error.code === "auth/weak-password"
        ? "Password should be at least 6 characters"
        : error.code === "auth/invalid-email"
        ? "Invalid email address"
        : error.message || "Failed to create account";
    throw new Error(errorMessage);
  }
};

// Send Password Reset Email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    const errorMessage =
      error.code === "auth/user-not-found"
        ? "No account found with this email"
        : error.code === "auth/invalid-email"
        ? "Invalid email address"
        : error.message || "Failed to send reset email";
    throw new Error(errorMessage);
  }
};

// Sign Out
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || "Failed to sign out");
  }
};

// Get Current User
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Get Current User Data with Firestore details
export const getCurrentUserData = async () => {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  try {
    // Get additional user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        ...userDoc.data(), // includes role, createdAt, etc.
      };
    } else {
      // Return basic auth data if Firestore document doesn't exist
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    // Return basic auth data on error
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }
};
