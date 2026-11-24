export type CartItem = {
  /** ProductVariant primary key from the backend. */
  id: string;
  variantId: string;
  productBvid: string;
  variantName: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
};
