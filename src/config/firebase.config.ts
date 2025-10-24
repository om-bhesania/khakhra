// firebase.config.ts - Updated Firebase Configuration

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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
import { doc, setDoc, getDoc } from "firebase/firestore";

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
        role: "user", // default role
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

// Email/Password Sign-Up
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  try {
    // Create user account
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Update Firebase Auth profile with display name
    await updateProfile(user, {
      displayName: displayName,
    });

    // Store additional user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      displayName: displayName,
      photoURL: null,
      role: "user", // default role
      provider: "email",
      createdAt: new Date(),
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
