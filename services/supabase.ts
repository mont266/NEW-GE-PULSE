
import { createClient } from '@supabase/supabase-js';

// --- Database Type Definition ---
// Provides type safety for Supabase queries. In a real project,
// this would be generated from your database schema.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          email: string | null
        }
        Insert: {
          id: string
          username?: string | null
          email?: string | null
        }
        Update: {
          username?: string | null
          email?: string | null
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          created_at: string
          id: number
          item_id: number
          user_id: string
        }
        Insert: {
          user_id: string
          item_id: number
        }
        Update: {
          user_id?: string
          item_id?: number
        }
        Relationships: []
      }
      investments: {
          Row: {
            id: string
            user_id: string
            item_id: number
            quantity: number
            purchase_price: number
            purchase_date: string
            sell_price: number | null
            sell_date: string | null
            tax_paid: number | null
            created_at: string
          }
          Insert: {
            user_id: string
            item_id: number
            quantity: number
            purchase_price: number
            purchase_date: string
            sell_price?: number | null
            sell_date?: string | null
            tax_paid?: number | null
            created_at?: string
          }
          Update: {
            user_id?: string
            item_id?: number
            quantity?: number
            purchase_price?: number
            purchase_date?: string
            sell_price?: number | null
            sell_date?: string | null
            tax_paid?: number | null
            created_at?: string
          }
          Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


// --- IMPORTANT ---
// 1. Create a project at https://supabase.com/
// 2. Go to your project's "Project Settings"
// 3. Go to the "API" section
// 4. Find your "Project URL" and "anon" "public" key
// 5. Paste them as strings into the variables below

const supabaseUrl = 'https://ascgkrirlbrffbuizgnm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzY2drcmlybGJyZmZidWl6Z25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MjMyNTAsImV4cCI6MjA2ODE5OTI1MH0.XWpApEJMRK7czCU-3y5OmFhH2qjjOUU2N8hv7Ss8udg';

// --- END OF CONFIG  ---

if (supabaseUrl === 'https://ascgkrirlbrffbuizgnm.supabase.co' || supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzY2drcmlybGJyZmZidWl6Z25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MjMyNTAsImV4cCI6MjA2ODE5OTI1MH0.XWpApEJMRK7czCU-3y5OmFhH2qjjOUU2N8hv7Ss8udg') {
    console.warn("Supabase credentials are not set. Please update services/supabase.ts. Authentication will not work.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
