export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          assigned_to: string | null
          body: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          direction: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          org_id: string
          outcome: string | null
          source: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          body?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          org_id: string
          outcome?: string | null
          source?: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          body?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          org_id?: string
          outcome?: string | null
          source?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_contact_id_fkey"
            columns: ["org_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_lead_id_fkey"
            columns: ["org_id", "lead_id"]
            isOneToOne: false
            referencedRelation: "lead_threads"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "activities_org_id_lead_id_fkey"
            columns: ["org_id", "lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          org_id: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          org_id: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: number
          org_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
          org_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: never
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_forms: {
        Row: {
          allowed_origins: string[]
          consent_text: string | null
          created_at: string
          default_owner_id: string | null
          default_source_id: string | null
          default_stage_id: string | null
          fields: Json
          id: string
          is_active: boolean
          name: string
          notify_owner: boolean
          org_id: string
          public_id: string
          redirect_url: string | null
          round_robin: boolean
          round_robin_cursor: number
          updated_at: string
        }
        Insert: {
          allowed_origins?: string[]
          consent_text?: string | null
          created_at?: string
          default_owner_id?: string | null
          default_source_id?: string | null
          default_stage_id?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          notify_owner?: boolean
          org_id: string
          public_id?: string
          redirect_url?: string | null
          round_robin?: boolean
          round_robin_cursor?: number
          updated_at?: string
        }
        Update: {
          allowed_origins?: string[]
          consent_text?: string | null
          created_at?: string
          default_owner_id?: string | null
          default_source_id?: string | null
          default_stage_id?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          notify_owner?: boolean
          org_id?: string
          public_id?: string
          redirect_url?: string | null
          round_robin?: boolean
          round_robin_cursor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_forms_default_owner_id_fkey"
            columns: ["default_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_forms_org_id_default_source_id_fkey"
            columns: ["org_id", "default_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "capture_forms_org_id_default_stage_id_fkey"
            columns: ["org_id", "default_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "capture_forms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          custom_fields: Json
          deleted_at: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          org_id: string
          owner_id: string | null
          size: string | null
          tags: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          deleted_at?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          org_id: string
          owner_id?: string | null
          size?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          deleted_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          owner_id?: string | null
          size?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          consent_source: string | null
          consent_text: string | null
          consent_withdrawn_at: string | null
          consented_at: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          deleted_at: string | null
          do_not_contact_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          lawful_basis: Database["public"]["Enums"]["lawful_basis"] | null
          notes: string | null
          org_id: string
          owner_id: string | null
          phone: string | null
          tags: string[]
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          consent_source?: string | null
          consent_text?: string | null
          consent_withdrawn_at?: string | null
          consented_at?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          deleted_at?: string | null
          do_not_contact_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lawful_basis?: Database["public"]["Enums"]["lawful_basis"] | null
          notes?: string | null
          org_id: string
          owner_id?: string | null
          phone?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          consent_source?: string | null
          consent_text?: string | null
          consent_withdrawn_at?: string | null
          consented_at?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          deleted_at?: string | null
          do_not_contact_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lawful_basis?: Database["public"]["Enums"]["lawful_basis"] | null
          notes?: string | null
          org_id?: string
          owner_id?: string | null
          phone?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_org_id_company_id_fkey"
            columns: ["org_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instance_settings: {
        Row: {
          allow_multiple_orgs: boolean
          first_org_created_at: string | null
          id: boolean
        }
        Insert: {
          allow_multiple_orgs?: boolean
          first_org_created_at?: string | null
          id?: boolean
        }
        Update: {
          allow_multiple_orgs?: boolean
          first_org_created_at?: string | null
          id?: boolean
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["org_role"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_stage_id: string | null
          id: number
          lead_id: string
          org_id: string
          to_stage_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_stage_id?: string | null
          id?: never
          lead_id: string
          org_id: string
          to_stage_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_stage_id?: string | null
          id?: never
          lead_id?: string
          org_id?: string
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_history_org_id_from_stage_id_fkey"
            columns: ["org_id", "from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "lead_stage_history_org_id_lead_id_fkey"
            columns: ["org_id", "lead_id"]
            isOneToOne: false
            referencedRelation: "lead_threads"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "lead_stage_history_org_id_lead_id_fkey"
            columns: ["org_id", "lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "lead_stage_history_org_id_to_stage_id_fkey"
            columns: ["org_id", "to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      leads: {
        Row: {
          api_key_id: string | null
          capture_form_id: string | null
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          custom_fields: Json
          deleted_at: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          org_id: string
          owner_id: string | null
          source_id: string | null
          stage_id: string
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[]
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          api_key_id?: string | null
          capture_form_id?: string | null
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          custom_fields?: Json
          deleted_at?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          org_id: string
          owner_id?: string | null
          source_id?: string | null
          stage_id: string
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[]
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          api_key_id?: string | null
          capture_form_id?: string | null
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          custom_fields?: Json
          deleted_at?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          org_id?: string
          owner_id?: string | null
          source_id?: string | null
          stage_id?: string
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_org_id_api_key_id_fkey"
            columns: ["org_id", "api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_org_id_capture_form_id_fkey"
            columns: ["org_id", "capture_form_id"]
            isOneToOne: false
            referencedRelation: "capture_forms"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_org_id_company_id_fkey"
            columns: ["org_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_org_id_contact_id_fkey"
            columns: ["org_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_org_id_source_id_fkey"
            columns: ["org_id", "source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_org_id_stage_id_fkey"
            columns: ["org_id", "stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          audit_retention_months: number | null
          cold_after_days: number
          created_at: string
          created_by: string | null
          currency: string
          date_format: string
          id: string
          lead_visibility: Database["public"]["Enums"]["lead_visibility"]
          logo_url: string | null
          name: string
          retention_months: number | null
          review_day: number
          setup_completed_at: string | null
          setup_step: Database["public"]["Enums"]["setup_step"]
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          audit_retention_months?: number | null
          cold_after_days?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          date_format?: string
          id?: string
          lead_visibility?: Database["public"]["Enums"]["lead_visibility"]
          logo_url?: string | null
          name: string
          retention_months?: number | null
          review_day?: number
          setup_completed_at?: string | null
          setup_step?: Database["public"]["Enums"]["setup_step"]
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          audit_retention_months?: number | null
          cold_after_days?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          date_format?: string
          id?: string
          lead_visibility?: Database["public"]["Enums"]["lead_visibility"]
          logo_url?: string | null
          name?: string
          retention_months?: number | null
          review_day?: number
          setup_completed_at?: string | null
          setup_step?: Database["public"]["Enums"]["setup_step"]
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          org_id: string
          position: number
          probability: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          org_id: string
          position: number
          probability?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          org_id?: string
          position?: number
          probability?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket: string
          hits: number
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      lead_threads: {
        Row: {
          closed_at: string | null
          cold_after_days: number | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          days_quiet: number | null
          expected_close_date: string | null
          folder: string | null
          id: string | null
          last_activity_at: string | null
          last_activity_inbound: boolean | null
          last_touch_at: string | null
          next_task_assigned_to: string | null
          next_task_body: string | null
          next_task_due_at: string | null
          next_task_due_on: string | null
          next_task_id: string | null
          org_id: string | null
          owner_id: string | null
          reason: string | null
          source_id: string | null
          stage_id: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          title: string | null
          today: string | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_assigned_to_fkey"
            columns: ["next_task_assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_org_id_company_id_fkey"
            columns: ["org_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_org_id_contact_id_fkey"
            columns: ["org_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_org_id_source_id_fkey"
            columns: ["org_id", "source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_org_id_stage_id_fkey"
            columns: ["org_id", "stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["org_id", "id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      apply_retention: { Args: never; Returns: Json }
      can_create_organization: { Args: never; Returns: boolean }
      can_edit_org_data: { Args: { p_org: string }; Returns: boolean }
      can_see_all_records: { Args: { p_org: string }; Returns: boolean }
      can_view_record: {
        Args: { p_org: string; p_owner: string }
        Returns: boolean
      }
      capture_lead: {
        Args: {
          p_api_key?: string
          p_form?: string
          p_org: string
          p_payload: Json
        }
        Returns: Json
      }
      clear_sample_data: { Args: { p_org: string }; Returns: undefined }
      create_organization: {
        Args: {
          p_currency?: string
          p_date_format?: string
          p_name: string
          p_timezone?: string
        }
        Returns: string
      }
      current_org_role: {
        Args: { p_org: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      erase_contact: { Args: { p_contact: string }; Returns: Json }
      export_contact_data: { Args: { p_contact: string }; Returns: Json }
      export_org_data: { Args: { p_org: string }; Returns: Json }
      get_invitation: {
        Args: { p_token: string }
        Returns: {
          email: string
          invited_by_name: string
          org_id: string
          org_name: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
        }[]
      }
      has_org_role: {
        Args: {
          p_org: string
          p_roles: Database["public"]["Enums"]["org_role"][]
        }
        Returns: boolean
      }
      hit_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      instance_initialized: { Args: never; Returns: boolean }
      is_org_admin: { Args: { p_org: string }; Returns: boolean }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      load_sample_data: { Args: { p_org: string }; Returns: undefined }
      log_activity: {
        Args: { p_org: string; p_payload: Json }
        Returns: string
      }
      next_round_robin_owner: { Args: { p_form: string }; Returns: string }
      purge_trash: { Args: { p_days?: number }; Returns: Json }
      rate_limit_ok: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      remove_member: { Args: { p_membership: string }; Returns: undefined }
      report: {
        Args: {
          p_from: string
          p_org: string
          p_owner?: string
          p_source?: string
          p_to: string
        }
        Returns: Json
      }
      report_leads: {
        Args: { p_org: string; p_owner: string; p_source: string }
        Returns: {
          api_key_id: string | null
          capture_form_id: string | null
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          custom_fields: Json
          deleted_at: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          org_id: string
          owner_id: string | null
          source_id: string | null
          stage_id: string
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[]
          title: string
          updated_at: string
          value: number
        }[]
        SetofOptions: {
          from: "*"
          to: "leads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      save_lead_sources: {
        Args: { p_org: string; p_sources: Json }
        Returns: undefined
      }
      save_pipeline_stages: {
        Args: { p_org: string; p_stages: Json }
        Returns: undefined
      }
      shares_org_with: { Args: { p_user: string }; Returns: boolean }
      start_conversation: {
        Args: { p_org: string; p_payload: Json }
        Returns: Json
      }
      transfer_ownership: {
        Args: { p_new_owner: string; p_org: string }
        Returns: undefined
      }
      update_member_role: {
        Args: {
          p_membership: string
          p_role: Database["public"]["Enums"]["org_role"]
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_type: "note" | "call" | "email" | "meeting" | "task"
      lawful_basis:
        | "consent"
        | "contract"
        | "legitimate_interest"
        | "legal_obligation"
      lead_status: "open" | "won" | "lost"
      lead_visibility: "all" | "own"
      membership_status: "active" | "disabled"
      org_role: "owner" | "admin" | "member" | "viewer"
      setup_step:
        | "organization"
        | "pipeline"
        | "sources"
        | "team"
        | "import"
        | "done"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type: ["note", "call", "email", "meeting", "task"],
      lawful_basis: [
        "consent",
        "contract",
        "legitimate_interest",
        "legal_obligation",
      ],
      lead_status: ["open", "won", "lost"],
      lead_visibility: ["all", "own"],
      membership_status: ["active", "disabled"],
      org_role: ["owner", "admin", "member", "viewer"],
      setup_step: [
        "organization",
        "pipeline",
        "sources",
        "team",
        "import",
        "done",
      ],
    },
  },
} as const

