export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  category: Category;
  created_at: string;
  image_url?: string;
  description?: string;
  status?: 'available' | 'sold' | 'reserved';
  viewsCount?: number;
  interestCount?: number;
  product_images?: ProductImage[];
}
