export type CartItem = {
  id: string;
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
