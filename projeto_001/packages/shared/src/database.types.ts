
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
            "match_players": {
                  Row: {
                    "avg_time_ms": number | null,"correct_count": number,"id": string,"match_id": string | null,"nickname": string,"rank": number | null,"score": number,"team": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avg_time_ms"?: number | null,"correct_count": number,"id"?: string,"match_id"?: string | null,"nickname": string,"rank"?: number | null,"score": number,"team"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "avg_time_ms"?: number | null,"correct_count"?: number,"id"?: string,"match_id"?: string | null,"nickname"?: string,"rank"?: number | null,"score"?: number,"team"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_players_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "ended_at": string | null,"host_id": string | null,"id": string,"mode": string,"settings": NonNullable<Json>,"started_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ended_at"?: string | null,"host_id"?: string | null,"id"?: string,"mode": string,"settings": NonNullable<Json>,"started_at": string
                  }
                  Update: {
                    "ended_at"?: string | null,"host_id"?: string | null,"id"?: string,"mode"?: string,"settings"?: NonNullable<Json>,"started_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_emoji": string | null,"created_at": string | null,"display_name": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_emoji"?: string | null,"created_at"?: string | null,"display_name": string,"id": string
                  }
                  Update: {
                    "avatar_emoji"?: string | null,"created_at"?: string | null,"display_name"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"question_reports": {
                  Row: {
                    "created_at": string | null,"id": string,"question_id": string | null,"reason": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"question_id"?: string | null,"reason"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"question_id"?: string | null,"reason"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_reports_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "question_reports_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "category": Database["public"]['Enums']["category"],"code": string | null,"code_lang": string | null,"correct": NonNullable<Json>,"created_at": string | null,"difficulty": Database["public"]['Enums']["difficulty"],"explanation": string,"id": string,"options": NonNullable<Json>,"prompt": string,"slug": string,"status": Database["public"]['Enums']["question_status"] | null,"tags": (string)[] | null,"type": Database["public"]['Enums']["question_type"],"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["category"],"code"?: string | null,"code_lang"?: string | null,"correct": NonNullable<Json>,"created_at"?: string | null,"difficulty": Database["public"]['Enums']["difficulty"],"explanation": string,"id"?: string,"options": NonNullable<Json>,"prompt": string,"slug": string,"status"?: Database["public"]['Enums']["question_status"] | null,"tags"?: (string)[] | null,"type": Database["public"]['Enums']["question_type"],"updated_at"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["category"],"code"?: string | null,"code_lang"?: string | null,"correct"?: NonNullable<Json>,"created_at"?: string | null,"difficulty"?: Database["public"]['Enums']["difficulty"],"explanation"?: string,"id"?: string,"options"?: NonNullable<Json>,"prompt"?: string,"slug"?: string,"status"?: Database["public"]['Enums']["question_status"] | null,"tags"?: (string)[] | null,"type"?: Database["public"]['Enums']["question_type"],"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_match_participant":
{ Args: { "p_match_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "category": "IA"|"WORKFLOW"|"PROGRAMACAO","difficulty": "facil"|"medio"|"dificil","question_status": "draft"|"published"|"archived","question_type": "multiple_choice"|"true_false"|"code_output"|"multi_select"
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
            "category": ["IA", "WORKFLOW", "PROGRAMACAO"],"difficulty": ["facil", "medio", "dificil"],"question_status": ["draft", "published", "archived"],"question_type": ["multiple_choice", "true_false", "code_output", "multi_select"]
          }
        }
} as const
