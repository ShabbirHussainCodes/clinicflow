
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"is_active": boolean,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"full_name": string,"id": string,"is_active"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"is_active"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"appointment_status_history": {
                  Row: {
                    "appointment_id": string,"changed_by": string | null,"created_at": string,"event": string,"from_status": string | null,"id": number,"metadata": NonNullable<Json>,"note": string | null,"to_status": string | null
                  }
                  Insert: {
                    "appointment_id": string,"changed_by"?: string | null,"created_at"?: string,"event": string,"from_status"?: string | null,"id"?: never,"metadata"?: NonNullable<Json>,"note"?: string | null,"to_status"?: string | null
                  }
                  Update: {
                    "appointment_id"?: string,"changed_by"?: string | null,"created_at"?: string,"event"?: string,"from_status"?: string | null,"id"?: never,"metadata"?: NonNullable<Json>,"note"?: string | null,"to_status"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointment_status_history_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointment_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "admin_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"appointments": {
                  Row: {
                    "admin_notes": string | null,"age_range": string | null,"cancellation_reason": string | null,"consent_at": string,"consent_given": boolean,"created_at": string,"doctor_id": string,"end_at": string,"id": string,"patient_email": string | null,"patient_name": string,"patient_phone": string,"reference": string,"service_id": string,"source": string,"start_at": string,"status": string,"status_changed_at": string,"updated_at": string,"visit_reason": string | null
                  }
                  Insert: {
                    "admin_notes"?: string | null,"age_range"?: string | null,"cancellation_reason"?: string | null,"consent_at"?: string,"consent_given": boolean,"created_at"?: string,"doctor_id": string,"end_at": string,"id"?: string,"patient_email"?: string | null,"patient_name": string,"patient_phone": string,"reference"?: string,"service_id": string,"source"?: string,"start_at": string,"status"?: string,"status_changed_at"?: string,"updated_at"?: string,"visit_reason"?: string | null
                  }
                  Update: {
                    "admin_notes"?: string | null,"age_range"?: string | null,"cancellation_reason"?: string | null,"consent_at"?: string,"consent_given"?: boolean,"created_at"?: string,"doctor_id"?: string,"end_at"?: string,"id"?: string,"patient_email"?: string | null,"patient_name"?: string,"patient_phone"?: string,"reference"?: string,"service_id"?: string,"source"?: string,"start_at"?: string,"status"?: string,"status_changed_at"?: string,"updated_at"?: string,"visit_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"automation_events": {
                  Row: {
                    "appointment_id": string | null,"attempts": number,"created_at": string,"dedupe_key": string | null,"delivered_at": string | null,"event_type": string,"id": string,"last_attempt_at": string | null,"last_error": string | null,"locked_until": string | null,"next_attempt_at": string,"payload": NonNullable<Json>,"status": string
                  }
                  Insert: {
                    "appointment_id"?: string | null,"attempts"?: number,"created_at"?: string,"dedupe_key"?: string | null,"delivered_at"?: string | null,"event_type": string,"id"?: string,"last_attempt_at"?: string | null,"last_error"?: string | null,"locked_until"?: string | null,"next_attempt_at"?: string,"payload": NonNullable<Json>,"status"?: string
                  }
                  Update: {
                    "appointment_id"?: string | null,"attempts"?: number,"created_at"?: string,"dedupe_key"?: string | null,"delivered_at"?: string | null,"event_type"?: string,"id"?: string,"last_attempt_at"?: string | null,"last_error"?: string | null,"locked_until"?: string | null,"next_attempt_at"?: string,"payload"?: NonNullable<Json>,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "automation_events_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    }
                  ]
                },"blocked_dates": {
                  Row: {
                    "created_at": string,"created_by": string | null,"doctor_id": string | null,"end_date": string,"id": string,"kind": string,"reason": string,"start_date": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"doctor_id"?: string | null,"end_date": string,"id"?: string,"kind"?: string,"reason"?: string,"start_date": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"doctor_id"?: string | null,"end_date"?: string,"id"?: string,"kind"?: string,"reason"?: string,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocked_dates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocked_dates_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    }
                  ]
                },"clinics": {
                  Row: {
                    "address_line1": string,"address_line2": string | null,"booking_window_days": number,"city": string,"created_at": string,"description": string | null,"email": string,"id": string,"max_active_bookings_per_phone": number,"min_notice_minutes": number,"name": string,"phone": string,"postal_code": string,"state": string,"tagline": string | null,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "address_line1": string,"address_line2"?: string | null,"booking_window_days"?: number,"city": string,"created_at"?: string,"description"?: string | null,"email": string,"id"?: string,"max_active_bookings_per_phone"?: number,"min_notice_minutes"?: number,"name": string,"phone": string,"postal_code": string,"state": string,"tagline"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address_line1"?: string,"address_line2"?: string | null,"booking_window_days"?: number,"city"?: string,"created_at"?: string,"description"?: string | null,"email"?: string,"id"?: string,"max_active_bookings_per_phone"?: number,"min_notice_minutes"?: number,"name"?: string,"phone"?: string,"postal_code"?: string,"state"?: string,"tagline"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"doctor_availability": {
                  Row: {
                    "created_at": string,"doctor_id": string,"end_time": string,"id": string,"start_time": string,"weekday": number
                  }
                  Insert: {
                    "created_at"?: string,"doctor_id": string,"end_time": string,"id"?: string,"start_time": string,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"doctor_id"?: string,"end_time"?: string,"id"?: string,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctor_availability_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    }
                  ]
                },"doctor_breaks": {
                  Row: {
                    "created_at": string,"doctor_id": string,"end_time": string,"id": string,"label": string,"start_time": string,"weekday": number | null
                  }
                  Insert: {
                    "created_at"?: string,"doctor_id": string,"end_time": string,"id"?: string,"label"?: string,"start_time": string,"weekday"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"doctor_id"?: string,"end_time"?: string,"id"?: string,"label"?: string,"start_time"?: string,"weekday"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctor_breaks_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    }
                  ]
                },"doctor_services": {
                  Row: {
                    "doctor_id": string,"service_id": string
                  }
                  Insert: {
                    "doctor_id": string,"service_id": string
                  }
                  Update: {
                    "doctor_id"?: string,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctor_services_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doctor_services_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"doctors": {
                  Row: {
                    "avatar_theme": string,"bio": string,"created_at": string,"display_order": number,"experience_years": number,"full_name": string,"id": string,"is_active": boolean,"languages": (string)[],"qualification": string,"slot_minutes": number,"slug": string,"specialization": string,"updated_at": string
                  }
                  Insert: {
                    "avatar_theme"?: string,"bio"?: string,"created_at"?: string,"display_order"?: number,"experience_years": number,"full_name": string,"id"?: string,"is_active"?: boolean,"languages"?: (string)[],"qualification": string,"slot_minutes"?: number,"slug": string,"specialization": string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_theme"?: string,"bio"?: string,"created_at"?: string,"display_order"?: number,"experience_years"?: number,"full_name"?: string,"id"?: string,"is_active"?: boolean,"languages"?: (string)[],"qualification"?: string,"slot_minutes"?: number,"slug"?: string,"specialization"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"services": {
                  Row: {
                    "created_at": string,"description": string,"display_order": number,"duration_minutes": number,"icon": string,"id": string,"is_active": boolean,"name": string,"slug": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description": string,"display_order"?: number,"duration_minutes": number,"icon"?: string,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"display_order"?: number,"duration_minutes"?: number,"icon"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_dashboard_summary":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_get_reschedule_slots":
{ Args: { "p_appointment_id": string,"p_date": string }; Returns: {
              "slot_end": string,"slot_start": string
            }[]
                           },
"admin_reschedule_appointment":
{ Args: { "p_appointment_id": string,"p_new_start_at": string,"p_note"?: string }; Returns: Json
                           },
"admin_retry_automation_event":
{ Args: { "p_event_id": string }; Returns: Json
                           },
"admin_search_appointments":
{ Args: { "p_date_from"?: string,"p_date_to"?: string,"p_doctor_id"?: string,"p_limit"?: number,"p_offset"?: number,"p_query"?: string,"p_service_id"?: string,"p_sort"?: string,"p_status"?: string }; Returns: Json
                           },
"admin_set_appointment_status":
{ Args: { "p_appointment_id": string,"p_note"?: string,"p_status": string }; Returns: Json
                           },
"admin_set_doctor_schedule":
{ Args: { "p_doctor_id": string,"p_slot_minutes": number,"p_windows": Json }; Returns: Json
                           },
"admin_update_appointment_notes":
{ Args: { "p_appointment_id": string,"p_notes": string }; Returns: Json
                           },
"book_appointment":
{ Args: { "p_age_range"?: string,"p_consent"?: boolean,"p_doctor_id": string,"p_patient_email"?: string,"p_patient_name": string,"p_patient_phone": string,"p_service_id": string,"p_start_at": string,"p_visit_reason"?: string }; Returns: Json
                           },
"claim_automation_events":
{ Args: { "p_limit"?: number,"p_lock_seconds"?: number }; Returns: {
              "attempts": number,"event_type": string,"id": string,"payload": Json
            }[]
                           },
"complete_automation_event":
{ Args: { "p_event_id": string }; Returns: undefined
                           },
"enqueue_due_reminders":
{ Args: { "p_lead_hours"?: number }; Returns: number
                           },
"fail_automation_event":
{ Args: { "p_error": string,"p_event_id": string,"p_max_attempts"?: number }; Returns: undefined
                           },
"get_available_dates":
{ Args: { "p_doctor_id": string,"p_from": string,"p_service_id": string,"p_to": string }; Returns: {
              "slot_count": number,"slot_date": string
            }[]
                           },
"get_available_slots":
{ Args: { "p_date": string,"p_doctor_id": string,"p_service_id": string }; Returns: {
              "slot_end": string,"slot_start": string
            }[]
                           },
"get_booking_confirmation":
{ Args: { "p_reference": string }; Returns: Json
                           },
"health_check":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"purge_delivered_automation_events":
{ Args: { "p_older_than_days"?: number }; Returns: number
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
