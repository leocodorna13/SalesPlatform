export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  status?: 'available' | 'sold' | 'hidden';
  visible?: boolean;
  featured?: boolean;
  category_id?: string;
  created_at?: string;
  updated_at?: string;
  views?: number;
  viewsCount?: number;
  views_count?: number;
  interestCount?: number;
  interest_count?: number;
  product_images?: ProductImage[];
  category?: Category;
  categories?: Category | Category[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary?: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  product_count?: number;
}

export interface SiteSettings {
  id?: string;
  heroTitle?: string;
  heroDescription?: string;
  heroImageUrl?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  paymentMethods?: string;
  whatsappMessage?: string;
  projectName?: string;
  carouselImages?: string[];
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}
