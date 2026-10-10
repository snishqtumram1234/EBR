export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          full_name: string
          house: string
          id: string
          is_default: boolean
          landmark: string | null
          phone: string
          pincode: string
          state: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          full_name: string
          house: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          phone: string
          pincode: string
          state: string
          street: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          city?: string
          created_at?: string
          full_name?: string
          house?: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          phone?: string
          pincode?: string
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          record_id: string | null
          table_name: string
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          record_id?: string | null
          table_name: string
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          record_id?: string | null
          table_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          unit_price_at_add_paise: number
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          unit_price_at_add_paise?: number
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          unit_price_at_add_paise?: number
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_product_id_fkey"
            columns: ["variant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "product_id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          order_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          order_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          order_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount_paise: number | null
          min_order_paise: number
          per_user_limit: number | null
          starts_at: string
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_paise?: number | null
          min_order_paise?: number
          per_user_limit?: number | null
          starts_at?: string
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_paise?: number | null
          min_order_paise?: number
          per_user_limit?: number | null
          starts_at?: string
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      delivery_methods: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_express: boolean
          max_days: number
          min_days: number
          name: string
          price_paise: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_express?: boolean
          max_days: number
          min_days: number
          name: string
          price_paise?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_express?: boolean
          max_days?: number
          min_days?: number
          name?: string
          price_paise?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          line_total_paise: number
          order_id: string
          product_id: string
          product_name: string
          product_slug: string
          quantity: number
          sku: string | null
          unit_price_paise: number
          updated_at: string
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          line_total_paise: number
          order_id: string
          product_id: string
          product_name: string
          product_slug: string
          quantity: number
          sku?: string | null
          unit_price_paise: number
          updated_at?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          line_total_paise?: number
          order_id?: string
          product_id?: string
          product_name?: string
          product_slug?: string
          quantity?: number
          sku?: string | null
          unit_price_paise?: number
          updated_at?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cart_hash: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          delivery_method_id: string
          delivery_method_name: string
          discount_paise: number
          expected_delivery_date: string | null
          expires_at: string | null
          gst_rate_bps: number
          id: string
          needs_review: boolean
          order_number: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          refunded_paise: number
          review_reason: string | null
          shipping_address: Json
          shipping_paise: number
          status: Database["public"]["Enums"]["order_status"]
          stock_released: boolean
          subtotal_paise: number
          tax_paise: number
          total_paise: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cart_hash?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          delivery_method_id: string
          delivery_method_name: string
          discount_paise?: number
          expected_delivery_date?: string | null
          expires_at?: string | null
          gst_rate_bps: number
          id?: string
          needs_review?: boolean
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          refunded_paise?: number
          review_reason?: string | null
          shipping_address: Json
          shipping_paise?: number
          status?: Database["public"]["Enums"]["order_status"]
          stock_released?: boolean
          subtotal_paise: number
          tax_paise?: number
          total_paise: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cart_hash?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          delivery_method_id?: string
          delivery_method_name?: string
          discount_paise?: number
          expected_delivery_date?: string | null
          expires_at?: string | null
          gst_rate_bps?: number
          id?: string
          needs_review?: boolean
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          refunded_paise?: number
          review_reason?: string | null
          shipping_address?: Json
          shipping_paise?: number
          status?: Database["public"]["Enums"]["order_status"]
          stock_released?: boolean
          subtotal_paise?: number
          tax_paise?: number
          total_paise?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_method_id_fkey"
            columns: ["delivery_method_id"]
            isOneToOne: false
            referencedRelation: "delivery_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paise: number
          confirmed_by: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          method: string | null
          order_id: string
          provider: string
          provider_order_id: string
          provider_payment_id: string | null
          raw_response: Json | null
          refunded_paise: number
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
          utr: string | null
          utr_submitted_at: string | null
        }
        Insert: {
          amount_paise: number
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          order_id: string
          provider: string
          provider_order_id: string
          provider_payment_id?: string | null
          raw_response?: Json | null
          refunded_paise?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
          utr?: string | null
          utr_submitted_at?: string | null
        }
        Update: {
          amount_paise?: number
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          order_id?: string
          provider?: string
          provider_order_id?: string
          provider_payment_id?: string | null
          raw_response?: Json | null
          refunded_paise?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
          utr?: string | null
          utr_submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
          storage_path: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          alt_text?: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          storage_path: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_product_id_fkey"
            columns: ["variant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "product_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          colour_hex: string
          colour_name: string
          created_at: string
          id: string
          is_active: boolean
          price_override_paise: number | null
          product_id: string
          sku: string
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          colour_hex: string
          colour_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          price_override_paise?: number | null
          product_id: string
          sku: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          colour_hex?: string
          colour_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          price_override_paise?: number | null
          product_id?: string
          sku?: string
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          depth_cm: number | null
          description: string
          discount_price_paise: number | null
          effective_price_paise: number | null
          has_variants: boolean
          height_cm: number | null
          id: string
          is_active: boolean
          is_featured: boolean
          material: string | null
          name: string
          price_paise: number
          rating_avg: number
          rating_count: number
          sales_count: number
          search_vector: unknown
          sku: string | null
          slug: string
          specifications: Json
          stock: number
          updated_at: string
          width_cm: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          depth_cm?: number | null
          description?: string
          discount_price_paise?: number | null
          effective_price_paise?: number | null
          has_variants?: boolean
          height_cm?: number | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          material?: string | null
          name: string
          price_paise: number
          rating_avg?: number
          rating_count?: number
          sales_count?: number
          search_vector?: unknown
          sku?: string | null
          slug: string
          specifications?: Json
          stock?: number
          updated_at?: string
          width_cm?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          depth_cm?: number | null
          description?: string
          discount_price_paise?: number | null
          effective_price_paise?: number | null
          has_variants?: boolean
          height_cm?: number | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          material?: string | null
          name?: string
          price_paise?: number
          rating_avg?: number
          rating_count?: number
          sales_count?: number
          search_vector?: unknown
          sku?: string | null
          slug?: string
          specifications?: Json
          stock?: number
          updated_at?: string
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_paise: number
          created_at: string
          id: string
          initiated_by: string | null
          order_id: string
          payment_id: string
          provider_refund_id: string | null
          raw_response: Json | null
          reason: string | null
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          id?: string
          initiated_by?: string | null
          order_id: string
          payment_id: string
          provider_refund_id?: string | null
          raw_response?: Json | null
          reason?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          id?: string
          initiated_by?: string | null
          order_id?: string
          payment_id?: string
          provider_refund_id?: string | null
          raw_response?: Json | null
          reason?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          product_id: string
          rating: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          product_id: string
          rating: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      serviceable_pincodes: {
        Row: {
          city: string
          created_at: string
          express_available: boolean
          express_days: number | null
          is_active: boolean
          pincode: string
          standard_days: number
          state: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          express_available?: boolean
          express_days?: number | null
          is_active?: boolean
          pincode: string
          standard_days: number
          state: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          express_available?: boolean
          express_days?: number | null
          is_active?: boolean
          pincode?: string
          standard_days?: number
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_confirm_payment: {
        Args: { p_actor: string; p_payment_id: string }
        Returns: string
      }
      admin_set_order_status: {
        Args: {
          p_actor: string
          p_note: string
          p_order_id: string
          p_to: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      apply_order_status: {
        Args: {
          p_actor: string
          p_note: string
          p_order_id: string
          p_to: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      assert_admin: { Args: { p_actor: string }; Returns: undefined }
      can_review_product: { Args: { p_product_id: string }; Returns: boolean }
      cancel_expired_orders: { Args: never; Returns: number }
      cancel_order: {
        Args: { p_actor: string; p_order_id: string; p_reason: string }
        Returns: undefined
      }
      create_order: {
        Args: { p_address: Json; p_delivery_method: string; p_items: Json }
        Returns: {
          order_id: string
          order_number: string
          reused: boolean
          total_paise: number
        }[]
      }
      current_unit_price: {
        Args: { p_product_id: string; p_variant_id: string }
        Returns: number
      }
      duplicate_order_window_minutes: { Args: never; Returns: number }
      fail: { Args: { p_code: string; p_message: string }; Returns: undefined }
      gst_rate_bps: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_valid_order_transition: {
        Args: {
          p_from: Database["public"]["Enums"]["order_status"]
          p_to: Database["public"]["Enums"]["order_status"]
        }
        Returns: boolean
      }
      mark_order_paid: {
        Args: {
          p_actor: string
          p_method: string
          p_payment_id: string
          p_provider_payment_id: string
          p_raw?: Json
        }
        Returns: string
      }
      order_expiry_minutes: { Args: never; Returns: number }
      reject_upi_payment: {
        Args: { p_actor: string; p_payment_id: string; p_reason: string }
        Returns: undefined
      }
      release_order_stock: { Args: { p_order_id: string }; Returns: undefined }
      submit_upi_payment: {
        Args: { p_reference: string; p_user: string; p_utr: string }
        Returns: string
      }
    }
    Enums: {
      coupon_type: "percent" | "flat"
      order_status:
        | "pending_payment"
        | "confirmed"
        | "processing"
        | "packed"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
      refund_status: "pending" | "processed" | "failed"
      user_role: "customer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      coupon_type: ["percent", "flat"],
      order_status: [
        "pending_payment",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      refund_status: ["pending", "processed", "failed"],
      user_role: ["customer", "admin"],
    },
  },
} as const
