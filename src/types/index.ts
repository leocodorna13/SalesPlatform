export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
}

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  product_id?: string;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  category?: Category;
  categories?: Category | Category[] | null;
  created_at: string;
  image_url?: string;
  description?: string;
  status?: 'available' | 'sold' | 'reserved';
  viewsCount?: number;
  interestCount?: number;
  product_images?: ProductImage[];
  views_count?: number;
  interest_count?: number;
  visible?: boolean;
  category_id?: string;
  views?: number; // Adicionado para compatibilidade
}
