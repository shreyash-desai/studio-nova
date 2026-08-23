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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          detail: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      bom_lines: {
        Row: {
          created_at: string
          id: string
          material_id: string
          product_id: string
          qty: number
          unit: Database["public"]["Enums"]["unit_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          product_id: string
          qty?: number
          unit?: Database["public"]["Enums"]["unit_type"]
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          product_id?: string
          qty?: number
          unit?: Database["public"]["Enums"]["unit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          active: boolean
          created_at: string
          default_unit: Database["public"]["Enums"]["unit_type"]
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_unit?: Database["public"]["Enums"]["unit_type"]
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_unit?: Database["public"]["Enums"]["unit_type"]
          id?: string
          name?: string
        }
        Relationships: []
      }
      operators: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          role: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          role?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          size: string | null
          sku: string
          variant: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          size?: string | null
          sku: string
          variant?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          size?: string | null
          sku?: string
          variant?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          channel_id: string | null
          condition: string | null
          created_at: string
          customer_id: string | null
          edited: boolean
          id: string
          material_id: string | null
          notes: string | null
          occurred_on: string
          order_number: string | null
          product_id: string | null
          qty: number
          reason: string | null
          ref: string
          reversal_of: string | null
          type: Database["public"]["Enums"]["txn_type"]
          unit: Database["public"]["Enums"]["unit_type"] | null
          unit_price: number | null
          voided: boolean
        }
        Insert: {
          channel_id?: string | null
          condition?: string | null
          created_at?: string
          customer_id?: string | null
          edited?: boolean
          id?: string
          material_id?: string | null
          notes?: string | null
          occurred_on?: string
          order_number?: string | null
          product_id?: string | null
          qty: number
          reason?: string | null
          ref: string
          reversal_of?: string | null
          type: Database["public"]["Enums"]["txn_type"]
          unit?: Database["public"]["Enums"]["unit_type"] | null
          unit_price?: number | null
          voided?: boolean
        }
        Update: {
          channel_id?: string | null
          condition?: string | null
          created_at?: string
          customer_id?: string | null
          edited?: boolean
          id?: string
          material_id?: string | null
          notes?: string | null
          occurred_on?: string
          order_number?: string | null
          product_id?: string | null
          qty?: number
          reason?: string | null
          ref?: string
          reversal_of?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
          unit?: Database["public"]["Enums"]["unit_type"] | null
          unit_price?: number | null
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "transactions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      txn_type: "received" | "used" | "printed" | "sold" | "return"
      unit_type: "kg" | "g" | "pcs" | "metres" | "rolls" | "sets"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      txn_type: ["received", "used", "printed", "sold", "return"],
      unit_type: ["kg", "g", "pcs", "metres", "rolls", "sets"],
    },
  },
} as const
