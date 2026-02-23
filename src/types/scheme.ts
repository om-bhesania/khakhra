import { Timestamp } from "firebase/firestore";

/**
 * Scheme document interface
 */
export interface Scheme {
  id: string;
  name: string;
  products: SchemeProduct[];
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Product in a scheme
 */
export interface SchemeProduct {
  productId: string;
  productName: string;
  barcode?: string;
}

/**
 * Form values for scheme form
 */
export interface SchemeFormValues {
  name: string;
  products: SchemeProduct[];
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
}
