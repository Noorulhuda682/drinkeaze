export type CatalogImage = {
  url: string;
  thumbnailUrl: string;
  __typename?: string;
};

export type CatalogProduct = {
  name: string;
  barcode: string | null;
  manufacturerCode: string | null;
  bvid: string;
  description: string;
  loyaltyPoints: number;
  images: CatalogImage[] | null;
  basePrice: number;
  discountedBasePrice: number;
  price: number;
  quantity: number | null;
  discountedPrice: number;
  preOrderTime: string | null;
  prepaidOnly: boolean;
  taxClass: Record<string, unknown> | null;
  cartonSize: number | null;
  maxOrderQuantity: number | null;
  minOrderQuantity: number | null;
  __typename?: string;
};

export type RestaurantCategory = {
  uid: string;
  name: string;
  bvid: string;
  imgUrl: string;
  showTitle: boolean;
  layout: string;
  products: CatalogProduct[];
  __typename?: string;
};

export type CatalogResponse = {
  data: {
    restaurantCatalog: RestaurantCategory[];
  };
};
