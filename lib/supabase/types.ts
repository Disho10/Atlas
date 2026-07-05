// Hand-written types matching supabase/migrations/0001_schema.sql.
// Once your project is live, you can replace this file by generating exact
// types with the Supabase CLI:
//   npx supabase gen types typescript --project-id <your-project-id> > lib/supabase/types.ts

export type UserRole = 'customer' | 'admin' | 'manager' | 'owner';
export type ProductCategoryDb = 'shirts' | 'socks' | 'balls' | 'shinpads' | 'sportswear';
export type ProductGenderDb = 'male' | 'female' | 'unisex';
export type OrderStatusDb = 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type OrderChannelDb = 'website' | 'instagram' | 'whatsapp';
export type PaymentMethodDb = 'whish_pay' | 'omt' | 'card' | 'cod';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          loyalty_points: number;
          referral_code: string | null;
          referred_by: string | null;
          notify_new_categories: boolean;
          notify_tag_matches: boolean;
          notify_order_updates: boolean;
          notify_rewards: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      leagues: {
        Row: {
          slug: string;
          name: string;
          country: string;
          primary_color: string;
          secondary_color: string;
          logo_url: string | null;
          sort_order: number;
        };
        Insert: Database['public']['Tables']['leagues']['Row'];
        Update: Partial<Database['public']['Tables']['leagues']['Row']>;
      };
      products: {
        Row: {
          id: string;
          code: string | null;
          name: string;
          category: ProductCategoryDb;
          league_slug: string | null;
          team: string | null;
          description: string | null;
          price_usd: number;
          compare_at_usd: number | null;
          cost_usd: number | null;
          gender: ProductGenderDb;
          sizes: string[];
          out_of_stock_sizes: string[];
          stock: number;
          low_stock_threshold: number;
          coming_soon: boolean;
          hot: boolean;
          status: 'draft' | 'published';
          image_url: string | null;
          rating: number;
          review_count: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['products']['Row']>;
        Update: Partial<Database['public']['Tables']['products']['Row']>;
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string | null;
          author_name: string;
          rating: number;
          body: string;
          photo_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['reviews']['Row']>;
        Update: Partial<Database['public']['Tables']['reviews']['Row']>;
      };
      wishlist_items: {
        Row: { user_id: string; product_id: string; created_at: string };
        Insert: { user_id: string; product_id: string };
        Update: never;
      };
      orders: {
        Row: {
          id: string;
          order_number: string | null;
          user_id: string | null;
          status: OrderStatusDb;
          channel: OrderChannelDb;
          payment_method: PaymentMethodDb;
          customer_name: string;
          customer_phone: string | null;
          customer_email: string | null;
          address: string;
          city: string | null;
          subtotal_usd: number;
          is_preorder: boolean;
          logged_by: string | null;
          telegram_notified: boolean;
          receipt_sent: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['orders']['Row']>;
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          size: string | null;
          qty: number;
          unit_price_usd: number;
        };
        Insert: Partial<Database['public']['Tables']['order_items']['Row']>;
        Update: never;
      };
      return_requests: {
        Row: {
          id: string;
          order_id: string;
          user_id: string | null;
          type: 'return' | 'exchange';
          reason: string;
          status: 'submitted' | 'approved' | 'rejected' | 'completed';
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['return_requests']['Row']>;
        Update: Partial<Database['public']['Tables']['return_requests']['Row']>;
      };
      search_logs: {
        Row: { id: string; term: string; result_count: number; user_id: string | null; created_at: string };
        Insert: { term: string; result_count: number; user_id?: string | null };
        Update: never;
      };
    };
  };
};
