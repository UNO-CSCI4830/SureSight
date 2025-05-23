export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string;
          created_at: string;
          details: Json | null;
          id: string;
          report_id: string | null;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          created_at?: string;
          details?: Json | null;
          id?: string;
          report_id?: string | null;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          created_at?: string;
          details?: Json | null;
          id?: string;
          report_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      adjuster_profiles: {
        Row: {
          adjuster_license: string | null;
          certification_verified: boolean;
          company_name: string;
          id: string;
          territories: string[] | null;
        };
        Insert: {
          adjuster_license?: string | null;
          certification_verified?: boolean;
          company_name: string;
          id: string;
          territories?: string[] | null;
        };
        Update: {
          adjuster_license?: string | null;
          certification_verified?: boolean;
          company_name?: string;
          id?: string;
          territories?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "adjuster_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      assessment_areas: {
        Row: {
          created_at: string;
          damage_type: string;
          dimensions: string | null;
          id: string;
          location: string;
          notes: string | null;
          report_id: string;
          severity: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          damage_type: string;
          dimensions?: string | null;
          id?: string;
          location: string;
          notes?: string | null;
          report_id: string;
          severity: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          damage_type?: string;
          dimensions?: string | null;
          id?: string;
          location?: string;
          notes?: string | null;
          report_id?: string;
          severity?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_areas_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          }
        ];
      };
      comments: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          parent_id: string | null;
          report_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          report_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          report_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      contractor_profiles: {
        Row: {
          company_name: string;
          id: string;
          insurance_verified: boolean;
          license_number: string | null;
          rating: number | null;
          service_area: string | null;
          specialties: string[] | null;
          years_experience: number | null;
        };
        Insert: {
          company_name: string;
          id: string;
          insurance_verified?: boolean;
          license_number?: string | null;
          rating?: number | null;
          service_area?: string | null;
          specialties?: string[] | null;
          years_experience?: number | null;
        };
        Update: {
          company_name?: string;
          id?: string;
          insurance_verified?: boolean;
          license_number?: string | null;
          rating?: number | null;
          service_area?: string | null;
          specialties?: string | null;
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "contractor_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      estimate_items: {
        Row: {
          created_at: string;
          description: string;
          estimate_id: string;
          id: string;
          quantity: number;
          total_price: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          description: string;
          estimate_id: string;
          id?: string;
          quantity: number;
          total_price: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          estimate_id?: string;
          id?: string;
          quantity?: number;
          total_price?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          }
        ];
      };
      estimates: {
        Row: {
          contractor_id: string;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          labor_cost: number | null;
          materials_cost: number | null;
          report_id: string;
          status: string;
          total_amount: number;
          updated_at: string;
          valid_until: string | null;
        };
        Insert: {
          contractor_id: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          labor_cost?: number | null;
          materials_cost?: number | null;
          report_id: string;
          status?: string;
          total_amount: number;
          updated_at?: string;
          valid_until?: string | null;
        };
        Update: {
          contractor_id?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          labor_cost?: number | null;
          materials_cost?: number | null;
          report_id?: string;
          status?: string;
          total_amount?: number;
          updated_at?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "estimates_contractor_id_fkey";
            columns: ["contractor_id"];
            isOneToOne: false;
            referencedRelation: "contractor_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimates_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          }
        ];
      };
      homeowner_profiles: {
        Row: {
          additional_notes: string | null;
          id: string;
          preferred_contact_method: string;
          property_count: number;
        };
        Insert: {
          additional_notes?: string | null;
          id: string;
          preferred_contact_method?: string;
          property_count?: number;
        };
        Update: {
          additional_notes?: string | null;
          id?: string;
          preferred_contact_method?: string;
          property_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "homeowner_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      images: {
        Row: {
          ai_confidence: number | null;
          ai_damage_severity: string | null;
          ai_damage_type: string | null;
          ai_processed: boolean;
          assessment_area_id: string | null;
          content_type: string | null;
          created_at: string;
          file_size: number | null;
          filename: string;
          height: number | null;
          id: string;
          metadata: Json | null;
          report_id: string | null;
          storage_path: string;
          uploaded_by: string | null;
          width: number | null;
        };
        Insert: {
          ai_confidence?: number | null;
          ai_damage_severity?: string | null;
          ai_damage_type?: string | null;
          ai_processed?: boolean;
          assessment_area_id?: string | null;
          content_type?: string | null;
          created_at?: string;
          file_size?: number | null;
          filename: string;
          height?: number | null;
          id?: string;
          metadata?: Json | null;
          report_id?: string | null;
          storage_path: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Update: {
          ai_confidence?: number | null;
          ai_damage_severity?: string | null;
          ai_damage_type?: string | null;
          ai_processed?: boolean;
          assessment_area_id?: string | null;
          content_type?: string | null;
          created_at?: string;
          file_size?: number | null;
          filename?: string;
          height?: number | null;
          id?: string;
          metadata?: Json | null;
          report_id?: string | null;
          storage_path?: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "images_assessment_area_id_fkey";
            columns: ["assessment_area_id"];
            isOneToOne: false;
            referencedRelation: "assessment_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "images_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "images_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      image_analysis: {
        Row: {
          id: string;
          image_id: string;
          damage_detected: boolean;
          confidence: number | null;
          raw_results: Json | null;
          analyzed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_id: string;
          damage_detected: boolean;
          confidence?: number | null;
          raw_results?: Json | null;
          analyzed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          image_id?: string;
          damage_detected?: boolean;
          confidence?: number | null;
          raw_results?: Json | null;
          analyzed_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "image_analysis_image_id_fkey";
            columns: ["image_id"];
            isOneToOne: false;
            referencedRelation: "images";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          is_read: boolean;
          receiver_id: string;
          sender_id: string;
          report_id: string | null;
          property_id: string | null;
          message_type: string;
          conversation_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          receiver_id: string;
          sender_id: string;
          report_id?: string | null;
          property_id?: string | null;
          message_type?: string;
          conversation_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          receiver_id?: string;
          sender_id?: string;
          report_id?: string | null;
          property_id?: string | null;
          message_type?: string;
          conversation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["auth_user_id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["auth_user_id"];
          },
          {
            foreignKeyName: "messages_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          message: string;
          notification_type: string;
          related_id: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message: string;
          notification_type: string;
          related_id?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message?: string;
          notification_type?: string;
          related_id?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      properties: {
        Row: {
          address_line1: string;
          address_line2: string | null;
          city: string;
          country: string;
          created_at: string;
          homeowner_id: string;
          id: string;
          postal_code: string;
          property_type: string | null;
          square_footage: number | null;
          state: string;
          updated_at: string;
          year_built: number | null;
        };
        Insert: {
          address_line1: string;
          address_line2?: string | null;
          city: string;
          country?: string;
          created_at?: string;
          homeowner_id: string;
          id?: string;
          postal_code: string;
          property_type?: string | null;
          square_footage?: number | null;
          state: string;
          updated_at?: string;
          year_built?: number | null;
        };
        Update: {
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          country?: string;
          created_at?: string;
          homeowner_id?: string;
          id?: string;
          postal_code?: string;
          property_type?: string | null;
          square_footage?: number | null;
          state?: string;
          updated_at?: string;
          year_built?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "properties_homeowner_id_fkey";
            columns: ["homeowner_id"];
            isOneToOne: false;
            referencedRelation: "homeowner_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      reports: {
        Row: {
          adjuster_id: string | null;
          contractor_id: string | null;
          created_at: string;
          creator_id: string;
          description: string | null;
          id: string;
          incident_date: string | null;
          property_id: string;
          reviewed_at: string | null;
          status: string;
          submitted_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          adjuster_id?: string | null;
          contractor_id?: string | null;
          created_at?: string;
          creator_id: string;
          description?: string | null;
          id?: string;
          incident_date?: string | null;
          property_id: string;
          reviewed_at?: string | null;
          status?: string;
          submitted_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          adjuster_id?: string | null;
          contractor_id?: string | null;
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          id?: string;
          incident_date?: string | null;
          property_id?: string;
          reviewed_at?: string | null;
          status?: string;
          submitted_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_adjuster_id_fkey";
            columns: ["adjuster_id"];
            isOneToOne: false;
            referencedRelation: "adjuster_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_contractor_id_fkey";
            columns: ["contractor_id"];
            isOneToOne: false;
            referencedRelation: "contractor_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          active: boolean;
          auth_user_id: string | null;
          avatar_url: string | null;
          created_at: string;
          email: string;
          email_confirmed: boolean;
          first_name: string;
          id: string;
          last_name: string;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          auth_user_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          email_confirmed?: boolean;
          first_name: string;
          id?: string;
          last_name: string;
          phone?: string | null;
          role: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          auth_user_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          email_confirmed?: boolean;
          first_name?: string;
          id?: string;
          last_name?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      add_assessment_area: {
        Args: {
          p_report_id: string;
          p_damage_type: string;
          p_location: string;
          p_severity: string;
          p_added_by: string;
          p_dimensions?: string;
          p_notes?: string;
        };
        Returns: string;
      };
      assign_contractor_to_report: {
        Args: {
          p_report_id: string;
          p_contractor_profile_id: string;
          p_assigned_by_user_id: string;
        };
        Returns: boolean;
      };
      create_property: {
        Args: {
          p_homeowner_profile_id: string;
          p_address_line1: string;
          p_city: string;
          p_state: string;
          p_postal_code: string;
          p_address_line2?: string;
          p_country?: string;
          p_property_type?: string;
          p_year_built?: number;
          p_square_footage?: number;
        };
        Returns: string;
      };
      create_report: {
        Args: {
          p_property_id: string;
          p_creator_id: string;
          p_title: string;
          p_description?: string;
          p_incident_date?: string;
        };
        Returns: string;
      };
      create_user_profile: {
        Args: {
          p_email: string;
          p_first_name: string;
          p_last_name: string;
          p_role: string;
          p_auth_user_id: string;
          p_avatar_url?: string;
          p_phone?: string;
          p_preferred_contact_method?: string;
          p_additional_notes?: string;
          p_company_name?: string;
          p_license_number?: string;
          p_specialties?: string[];
          p_years_experience?: number;
          p_service_area?: string;
          p_insurance_verified?: boolean;
          p_adjuster_license?: string;
          p_territories?: string[];
          p_certification_verified?: boolean;
        };
        Returns: string;
      };
      get_complete_user_profile: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      insert_image_record: {
        Args: {
          p_storage_path: string;
          p_filename: string;
          p_content_type: string;
          p_file_size: number;
          p_report_id?: string;
          p_assessment_area_id?: string;
          p_uploaded_by?: string;
          p_ai_processed?: boolean;
          p_property_id?: string;
        };
        Returns: string;
      };
      submit_report: {
        Args: {
          p_report_id: string;
          p_submitted_by: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      contact_method: "email" | "phone" | "sms";
      damage_severity: "minor" | "moderate" | "severe" | "critical";
      damage_type: "roof" | "siding" | "window" | "structural" | "water" | "other";
      report_status: "draft" | "submitted" | "in_review" | "approved" | "rejected";
      user_role: "homeowner" | "contractor" | "adjuster" | "admin";
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
