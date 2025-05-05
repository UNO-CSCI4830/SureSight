export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          created_at: string | null
          details: Json | null
          id: string
          report_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          report_id?: string | null
          user_id?: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          report_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      adjuster_profiles: {
        Row: {
          adjuster_license: string | null
          certification_verified: boolean | null
          company_name: string
          id: string
          territories: string[] | null
        }
        Insert: {
          adjuster_license?: string | null
          certification_verified?: boolean | null
          company_name: string
          id: string
          territories?: string[] | null
        }
        Update: {
          adjuster_license?: string | null
          certification_verified?: boolean | null
          company_name?: string
          id?: string
          territories?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "adjuster_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_areas: {
        Row: {
          created_at: string | null
          damage_type: Database["public"]["Enums"]["damage_type"]
          dimensions: string | null
          id: string
          location: string
          notes: string | null
          report_id: string
          severity: Database["public"]["Enums"]["damage_severity"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          damage_type: Database["public"]["Enums"]["damage_type"]
          dimensions?: string | null
          id?: string
          location: string
          notes?: string | null
          report_id: string
          severity: Database["public"]["Enums"]["damage_severity"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          damage_type?: Database["public"]["Enums"]["damage_type"]
          dimensions?: string | null
          id?: string
          location?: string
          notes?: string | null
          report_id?: string
          severity?: Database["public"]["Enums"]["damage_severity"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_areas_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          report_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          report_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          report_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_profiles: {
        Row: {
          availability_status: string | null
          company_name: string
          id: string
          insurance_verified: boolean | null
          last_active: string | null
          license_number: string | null
          rating: number | null
          rating_count: number | null
          search_radius: number | null
          service_area: string | null
          service_areas: string[] | null
          specialties: string[] | null
          years_experience: number | null
        }
        Insert: {
          availability_status?: string | null
          company_name: string
          id: string
          insurance_verified?: boolean | null
          last_active?: string | null
          license_number?: string | null
          rating?: number | null
          rating_count?: number | null
          search_radius?: number | null
          service_area?: string | null
          service_areas?: string[] | null
          specialties?: string[] | null
          years_experience?: number | null
        }
        Update: {
          availability_status?: string | null
          company_name?: string
          id?: string
          insurance_verified?: boolean | null
          last_active?: string | null
          license_number?: string | null
          rating?: number | null
          rating_count?: number | null
          search_radius?: number | null
          service_area?: string | null
          service_areas?: string[] | null
          specialties?: string[] | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_requests: {
        Row: {
          contractor_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          report_id: string
          requested_at: string | null
          requested_by: string
          response_deadline: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          report_id: string
          requested_at?: string | null
          requested_by: string
          response_deadline?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          report_id?: string
          requested_at?: string | null
          requested_by?: string
          response_deadline?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_requests_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          created_at: string | null
          description: string
          estimate_id: string
          id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          estimate_id: string
          id?: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          estimate_id?: string
          id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          contractor_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          labor_cost: number | null
          materials_cost: number | null
          report_id: string
          status: string | null
          total_amount: number
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          labor_cost?: number | null
          materials_cost?: number | null
          report_id: string
          status?: string | null
          total_amount: number
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          labor_cost?: number | null
          materials_cost?: number | null
          report_id?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_profiles: {
        Row: {
          additional_notes: string | null
          id: string
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          property_count: number | null
        }
        Insert: {
          additional_notes?: string | null
          id: string
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          property_count?: number | null
        }
        Update: {
          additional_notes?: string | null
          id?: string
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          property_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      image_analysis: {
        Row: {
          affected_areas: string[] | null
          analyzed_at: string | null
          assessment_area_id: string | null
          confidence: number | null
          created_at: string | null
          damage_detected: boolean | null
          damage_severity: string | null
          damage_types: string[] | null
          id: string
          image_id: string
          raw_results: Json | null
          report_id: string | null
        }
        Insert: {
          affected_areas?: string[] | null
          analyzed_at?: string | null
          assessment_area_id?: string | null
          confidence?: number | null
          created_at?: string | null
          damage_detected?: boolean | null
          damage_severity?: string | null
          damage_types?: string[] | null
          id?: string
          image_id: string
          raw_results?: Json | null
          report_id?: string | null
        }
        Update: {
          affected_areas?: string[] | null
          analyzed_at?: string | null
          assessment_area_id?: string | null
          confidence?: number | null
          created_at?: string | null
          damage_detected?: boolean | null
          damage_severity?: string | null
          damage_types?: string[] | null
          id?: string
          image_id?: string
          raw_results?: Json | null
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_image_analysis_assessment_area"
            columns: ["assessment_area_id"]
            isOneToOne: false
            referencedRelation: "assessment_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_image_analysis_image"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_image_analysis_report"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_analysis_assessment_area_id_fkey"
            columns: ["assessment_area_id"]
            isOneToOne: false
            referencedRelation: "assessment_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_analysis_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_analysis_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          ai_confidence: number | null
          ai_damage_severity:
            | Database["public"]["Enums"]["damage_severity"]
            | null
          ai_damage_type: Database["public"]["Enums"]["damage_type"] | null
          ai_processed: boolean | null
          assessment_area_id: string | null
          content_type: string | null
          created_at: string | null
          file_size: number | null
          filename: string
          height: number | null
          id: string
          metadata: Json | null
          report_id: string | null
          storage_path: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_damage_severity?:
            | Database["public"]["Enums"]["damage_severity"]
            | null
          ai_damage_type?: Database["public"]["Enums"]["damage_type"] | null
          ai_processed?: boolean | null
          assessment_area_id?: string | null
          content_type?: string | null
          created_at?: string | null
          file_size?: number | null
          filename: string
          height?: number | null
          id?: string
          metadata?: Json | null
          report_id?: string | null
          storage_path: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          ai_confidence?: number | null
          ai_damage_severity?:
            | Database["public"]["Enums"]["damage_severity"]
            | null
          ai_damage_type?: Database["public"]["Enums"]["damage_type"] | null
          ai_processed?: boolean | null
          assessment_area_id?: string | null
          content_type?: string | null
          created_at?: string | null
          file_size?: number | null
          filename?: string
          height?: number | null
          id?: string
          metadata?: Json | null
          report_id?: string | null
          storage_path?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "images_assessment_area_id_fkey"
            columns: ["assessment_area_id"]
            isOneToOne: false
            referencedRelation: "assessment_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          property_id: string | null
          receiver_id: string
          report_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          property_id?: string | null
          receiver_id: string
          report_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          property_id?: string | null
          receiver_id?: string
          report_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          related_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          related_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          related_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string | null
          created_at: string | null
          homeowner_id: string
          id: string
          postal_code: string
          property_type: string | null
          square_footage: number | null
          state: string
          updated_at: string | null
          year_built: number | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string | null
          created_at?: string | null
          homeowner_id: string
          id?: string
          postal_code: string
          property_type?: string | null
          square_footage?: number | null
          state: string
          updated_at?: string | null
          year_built?: number | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string | null
          created_at?: string | null
          homeowner_id?: string
          id?: string
          postal_code?: string
          property_type?: string | null
          square_footage?: number | null
          state?: string
          updated_at?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "homeowner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_collaborators: {
        Row: {
          created_at: string | null
          id: string
          invitation_email: string | null
          invitation_status: string
          invited_by: string | null
          permission_level: string
          report_id: string
          role_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invitation_email?: string | null
          invitation_status: string
          invited_by?: string | null
          permission_level: string
          report_id: string
          role_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invitation_email?: string | null
          invitation_status?: string
          invited_by?: string | null
          permission_level?: string
          report_id?: string
          role_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_collaborators_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          adjuster_id: string | null
          contractor_id: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          incident_date: string | null
          property_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          submitted_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          adjuster_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          incident_date?: string | null
          property_id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          submitted_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          adjuster_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          incident_date?: string | null
          property_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          submitted_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_adjuster_id_fkey"
            columns: ["adjuster_id"]
            isOneToOne: false
            referencedRelation: "adjuster_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          email_confirmed: boolean | null
          first_name: string | null
          id: string
          last_name: string | null
          password_reset: Database["public"]["Enums"]["password_reset"] | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_confirmed?: boolean | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          password_reset?: Database["public"]["Enums"]["password_reset"] | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_confirmed?: boolean | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          password_reset?: Database["public"]["Enums"]["password_reset"] | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_assessment_area: {
        Args: {
          p_report_id: string
          p_damage_type: Database["public"]["Enums"]["damage_type"]
          p_location: string
          p_severity: Database["public"]["Enums"]["damage_severity"]
          p_added_by: string
          p_dimensions?: string
          p_notes?: string
        }
        Returns: string
      }
      assign_contractor_to_report: {
        Args:
          | {
              p_report_id: string
              p_contractor_profile_id: string
              p_assigned_by_user_id: string
            }
          | { p_request_id: string; p_contractor_id: string }
        Returns: boolean
      }
      user_has_report_access: {
        Args: { p_user_id: string; p_report_id: string }
        Returns: boolean
      }
      user_has_edit_access: {
        Args: { p_user_id: string; p_report_id: string }
        Returns: boolean
      }
      user_has_manage_access: {
        Args: { p_user_id: string; p_report_id: string }
        Returns: boolean
      }
      calculate_contractor_match_score: {
        Args: { p_contractor_id: string; p_report_id: string }
        Returns: number
      }
      check_database_status: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      check_user_setup: {
        Args: { auth_id: string }
        Returns: {
          table_name: string
          record_exists: boolean
          role_profile_created: boolean
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      count_unread_messages: {
        Args: { p_user_id: string }
        Returns: number
      }
      create_property: {
        Args: {
          p_homeowner_profile_id: string
          p_address_line1: string
          p_city: string
          p_state: string
          p_postal_code: string
          p_address_line2?: string
          p_country?: string
          p_property_type?: string
          p_year_built?: number
          p_square_footage?: number
        }
        Returns: string
      }
      create_report: {
        Args: {
          p_property_id: string
          p_creator_id: string
          p_title: string
          p_description?: string
          p_incident_date?: string
        }
        Returns: string
      }
      create_user_profile: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_auth_user_id: string
          p_avatar_url?: string
          p_phone?: string
          p_preferred_contact_method?: Database["public"]["Enums"]["contact_method"]
          p_additional_notes?: string
          p_company_name?: string
          p_license_number?: string
          p_specialties?: string[]
          p_years_experience?: number
          p_service_area?: string
          p_insurance_verified?: boolean
          p_adjuster_license?: string
          p_territories?: string[]
          p_certification_verified?: boolean
        }
        Returns: string
      }
      debug_rls_policies: {
        Args: { table_name: string }
        Returns: {
          policy_name: string
          cmd: string
          qual: string
          with_check: string
        }[]
      }
      delete_user_profile: {
        Args: { p_user_id: string }
        Returns: Json
      }
      find_available_contractors: {
        Args: { p_report_id: string; p_limit?: number; p_min_rating?: number }
        Returns: {
          contractor_id: string
          contractor_name: string
          company_name: string
          service_areas: string[]
          specialties: string[]
          years_experience: number
          rating: number
          availability_status: string
          match_score: number
        }[]
      }
      fix_missing_user_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          profile_created: boolean
          role_profile_created: boolean
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      generate_conversation_id: {
        Args: { sender: string; receiver: string }
        Returns: string
      }
      get_auth_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_complete_user_profile: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_conversations: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          other_user_id: string
          last_message_at: string
          unread_count: number
          last_message: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      manage_user_profile: {
        Args: {
          p_user_id: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_role: string
          p_avatar_url?: string
          p_preferred_contact_method?: string
          p_additional_notes?: string
          p_company_name?: string
          p_license_number?: string
          p_specialties?: string[]
          p_years_experience?: number
          p_service_area?: string
          p_adjuster_license?: string
          p_territories?: string[]
        }
        Returns: Json
      }
      mark_messages_as_read: {
        Args: { p_message_ids: string[] }
        Returns: undefined
      }
      now: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      submit_report: {
        Args: { p_report_id: string; p_submitted_by: string }
        Returns: boolean
      }
    }
    Enums: {
      contact_method: "email" | "phone" | "sms"
      damage_severity: "minor" | "moderate" | "severe" | "critical"
      damage_type:
        | "roof"
        | "siding"
        | "window"
        | "structural"
        | "water"
        | "other"
      password_reset: "requested" | "verified" | "completed" | "cancel"
      report_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
      user_role: "homeowner" | "contractor" | "adjuster" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      contact_method: ["email", "phone", "sms"],
      damage_severity: ["minor", "moderate", "severe", "critical"],
      damage_type: ["roof", "siding", "window", "structural", "water", "other"],
      password_reset: ["requested", "verified", "completed", "cancel"],
      report_status: [
        "draft",
        "submitted",
        "in_review",
        "approved",
        "rejected",
      ],
      user_role: ["homeowner", "contractor", "adjuster", "admin"],
    },
  },
} as const
