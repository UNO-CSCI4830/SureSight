export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      roles: {
        Row: {
          id: number
          name: string
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          created_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: number
          user_id: string
          role_id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          role_id: number
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          role_id?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      homeowner_profiles: {
        Row: {
          id: string
          user_id: string
          preferred_contact_method: string | null
          additional_notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          user_id: string
          preferred_contact_method?: string | null
          additional_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          preferred_contact_method?: string | null
          additional_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      contractor_profiles: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          license_number: string | null
          specialties: string[] | null
          years_experience: number | null
          service_area: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          user_id: string
          company_name?: string | null
          license_number?: string | null
          specialties?: string[] | null
          years_experience?: number | null
          service_area?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          license_number?: string | null
          specialties?: string[] | null
          years_experience?: number | null
          service_area?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      adjuster_profiles: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          adjuster_license: string | null
          territories: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          user_id: string
          company_name?: string | null
          adjuster_license?: string | null
          territories?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          adjuster_license?: string | null
          territories?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjuster_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}