export type Shop = {
  id: string;
  ownerUid: string;
  name: string;
  slug: string;
  status: "active" | "paused" | "closed";
  createdAt?: any;
  coverUrl?: string;
};

export type Product = {
  id: string;
  shopId: string;
  name: string;
  priceCents: number;
  isActive: boolean;
};

export type CartItem = {
  productId: string;
  name: string;
  unitPriceCents: number;
  qty: number;
};

export type Order = {
  id: string;
  shopId: string;
  buyerUid: string;
  status: "placed";
  subtotalCents: number;
  totalCents: number;
  createdAt?: any;
};
