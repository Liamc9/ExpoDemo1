// packages/shared/types.ts (or apps/mobile/src/types.ts)

// Core primitives you’ll reuse
export type ID = string;
export type Cents = number; // store prices in cents (Stripe-friendly)

// Firestore timestamp fields you’ll commonly use
export type Timestamps = {
  createdAt?: Date;
  updatedAt?: Date;
};

// Users
export type UserProfile = Timestamps & {
  id: ID;
  name: string;
  email: string;
  photoURL?: string | null;
};

// Shops
export type Shop = Timestamps & {
  id: ID;
  ownerId: ID;
  name: string;
  description?: string;
  imageUrl?: string | null;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  isOpen?: boolean;
};

// Products
export type Product = Timestamps & {
  id: ID;
  shopId: ID;
  name: string;
  description?: string;
  unitPriceCents: Cents;
  imageUrl?: string | null;
  inStock?: boolean;
};

// Cart
export type CartItem = {
  id: ID; // Firestore doc id
  productId: ID;
  name: string;
  qty: number;
  unitPriceCents: Cents;
  imageUrl?: string | null;
};

export type CheckoutSession = Timestamps & {
  id: ID;
  userId: ID;
  shopId: ID;
  items: CartItem[];
  totalCents: Cents;
  status: "pending" | "paid" | "failed";
};
