/**
 * Hand-authored Supabase database types matching docs/ARCHITECTURE.md §4.
 * Once a Supabase project is linked, replace this file with generated types:
 *   supabase gen types typescript --project-id <ref> > types/database.ts
 */

export type ScheduleItemType =
  | "meeting"
  | "task"
  | "deadline"
  | "habit"
  | "appointment"
  | "break"
  | "activity";
export type ScheduleItemStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "skipped"
  | "cancelled";
export type ScheduleItemSource = "lifeflow" | "google" | "outlook" | "apple" | "ai_suggested";
export type HabitCategory =
  | "sleep"
  | "fitness"
  | "hydration"
  | "reading"
  | "mindfulness"
  | "movement"
  | "custom";
export type HabitCadence = "daily" | "weekly" | "custom";
export type CalendarProvider = "google" | "outlook" | "apple";
export type CalendarSyncStatus = "active" | "paused" | "error" | "revoked";
export type NotificationType =
  | "leave_now"
  | "break_reminder"
  | "weather"
  | "free_time"
  | "reschedule"
  | "habit_skip"
  | "weekly_report";
export type ChatRole = "user" | "assistant" | "tool";
export type RescheduleReason = "delay" | "manual" | "conflict" | "ai_optimization";
export type RescheduleTrigger = "user" | "ai" | "system";
export type Theme = "light" | "dark" | "system";
export type Chronotype = "early_bird" | "night_owl" | "flexible";
export type FoodSource = "usda" | "custom" | "recipe";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "drink";
export type GoalCategory =
  | "fitness"
  | "business"
  | "learning"
  | "finance"
  | "reading"
  | "career"
  | "travel"
  | "personal"
  | "health"
  | "custom";

export interface RecurrenceRule {
  freq: "daily" | "weekly" | "monthly";
  interval: number;
  byWeekday?: number[];
  until?: string | null;
  count?: number | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          timezone: string;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          wake_time: string;
          sleep_time: string;
          working_hours: Record<string, [string, string]>;
          chronotype: Chronotype;
          default_task_buffer_minutes: number;
          focus_block_minutes: number;
          break_minutes: number;
          theme: Theme;
          notification_prefs: Record<string, boolean>;
          default_lat: number | null;
          default_lng: number | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_settings"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Row"]>;
        Relationships: [];
      };
      schedule_items: {
        Row: {
          id: string;
          user_id: string;
          type: ScheduleItemType;
          title: string;
          description: string | null;
          status: ScheduleItemStatus;
          priority: number;
          is_fixed: boolean;
          estimated_duration_minutes: number | null;
          actual_duration_minutes: number | null;
          scheduled_start: string | null;
          scheduled_end: string | null;
          due_at: string | null;
          location: string | null;
          source: ScheduleItemSource;
          external_event_id: string | null;
          external_updated_at: string | null;
          habit_id: string | null;
          parent_item_id: string | null;
          ai_reasoning: string | null;
          category: string | null;
          notes: string | null;
          recurrence_rule: RecurrenceRule | null;
          archived_at: string | null;
          sort_order: number;
          goal_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["schedule_items"]["Row"]> & {
          user_id: string;
          type: ScheduleItemType;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_items"]["Row"]>;
        Relationships: [];
      };
      reschedule_events: {
        Row: {
          id: string;
          user_id: string;
          schedule_item_id: string | null;
          reason: RescheduleReason;
          previous_start: string | null;
          previous_end: string | null;
          new_start: string | null;
          new_end: string | null;
          triggered_by: RescheduleTrigger;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reschedule_events"]["Row"]> & {
          user_id: string;
          reason: RescheduleReason;
          triggered_by: RescheduleTrigger;
        };
        Update: Partial<Database["public"]["Tables"]["reschedule_events"]["Row"]>;
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string | null;
          category: HabitCategory | null;
          cadence: HabitCadence;
          target_value: number | null;
          target_unit: string | null;
          preferred_time: string | null;
          reminder_enabled: boolean;
          paused_at: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["habits"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["habits"]["Row"]>;
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          logged_for_date: string;
          completed: boolean;
          value: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["habit_logs"]["Row"]> & {
          habit_id: string;
          user_id: string;
          logged_for_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["habit_logs"]["Row"]>;
        Relationships: [];
      };
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          schedule_item_id: string | null;
          planned_duration_minutes: number;
          actual_duration_minutes: number | null;
          pomodoro_cycles: number;
          started_at: string;
          ended_at: string | null;
          interrupted: boolean;
          mood_after: number | null;
          energy_after: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["focus_sessions"]["Row"]> & {
          user_id: string;
          planned_duration_minutes: number;
        };
        Update: Partial<Database["public"]["Tables"]["focus_sessions"]["Row"]>;
        Relationships: [];
      };
      mood_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_at: string;
          mood: number;
          energy: number | null;
          note: string | null;
          stress: number | null;
          motivation: number | null;
          productivity: number | null;
          happiness: number | null;
          sleep_quality: number | null;
          anxiety: number | null;
          confidence: number | null;
          focus: number | null;
          logged_for_date: string;
        };
        Insert: Partial<Database["public"]["Tables"]["mood_logs"]["Row"]> & {
          user_id: string;
          mood: number;
        };
        Update: Partial<Database["public"]["Tables"]["mood_logs"]["Row"]>;
        Relationships: [];
      };
      calendar_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: CalendarProvider;
          account_email: string | null;
          access_token_encrypted: string | null;
          refresh_token_encrypted: string | null;
          token_expires_at: string | null;
          scopes: string[] | null;
          sync_status: CalendarSyncStatus;
          last_synced_at: string | null;
          sync_cursor: string | null;
          channel_id: string | null;
          channel_resource_id: string | null;
          channel_expiration: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calendar_connections"]["Row"]> & {
          user_id: string;
          provider: CalendarProvider;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_connections"]["Row"]>;
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_conversations"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_conversations"]["Row"]>;
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: ChatRole;
          content: string;
          tool_calls: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_messages"]["Row"]> & {
          conversation_id: string;
          role: ChatRole;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_messages"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          related_item_id: string | null;
          delivered_at: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      weekly_reports: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          productive_minutes: number | null;
          tasks_completed: number | null;
          tasks_planned: number | null;
          focus_score: number | null;
          habit_streak_summary: Record<string, unknown> | null;
          mood_trend: Record<string, unknown> | null;
          ai_recommendations: string[] | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["weekly_reports"]["Row"]> & {
          user_id: string;
          week_start: string;
        };
        Update: Partial<Database["public"]["Tables"]["weekly_reports"]["Row"]>;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tags"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
        Relationships: [];
      };
      schedule_item_tags: {
        Row: {
          schedule_item_id: string;
          tag_id: string;
        };
        Insert: Database["public"]["Tables"]["schedule_item_tags"]["Row"];
        Update: Partial<Database["public"]["Tables"]["schedule_item_tags"]["Row"]>;
        Relationships: [];
      };
      task_attachments: {
        Row: {
          id: string;
          schedule_item_id: string;
          user_id: string;
          file_name: string;
          storage_path: string;
          file_size_bytes: number;
          mime_type: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_attachments"]["Row"]> & {
          schedule_item_id: string;
          user_id: string;
          file_name: string;
          storage_path: string;
          file_size_bytes: number;
          mime_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_attachments"]["Row"]>;
        Relationships: [];
      };
      foods: {
        Row: {
          id: string;
          name: string;
          brand: string | null;
          calories: number;
          protein_g: number;
          fat_g: number;
          carbs_g: number;
          fiber_g: number;
          sugar_g: number;
          sodium_mg: number;
          serving_size: number;
          serving_unit: string;
          weight_g: number | null;
          default_meal_type: MealType | null;
          source: FoodSource;
          external_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["foods"]["Row"]> & {
          name: string;
          calories: number;
        };
        Update: Partial<Database["public"]["Tables"]["foods"]["Row"]>;
        Relationships: [];
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          food_id: string | null;
          meal_type: MealType;
          logged_at: string;
          quantity: number;
          calories: number;
          protein_g: number;
          fat_g: number;
          carbs_g: number;
          fiber_g: number;
          sugar_g: number;
          sodium_mg: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["food_logs"]["Row"]> & {
          user_id: string;
          meal_type: MealType;
          calories: number;
          protein_g: number;
          fat_g: number;
          carbs_g: number;
          fiber_g: number;
        };
        Update: Partial<Database["public"]["Tables"]["food_logs"]["Row"]>;
        Relationships: [];
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_at: string;
          amount_ml: number;
        };
        Insert: Partial<Database["public"]["Tables"]["water_logs"]["Row"]> & {
          user_id: string;
          amount_ml: number;
        };
        Update: Partial<Database["public"]["Tables"]["water_logs"]["Row"]>;
        Relationships: [];
      };
      body_metrics: {
        Row: {
          id: string;
          user_id: string;
          logged_for_date: string;
          weight_kg: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["body_metrics"]["Row"]> & {
          user_id: string;
          logged_for_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["body_metrics"]["Row"]>;
        Relationships: [];
      };
      nutrition_settings: {
        Row: {
          user_id: string;
          daily_calorie_goal: number;
          protein_goal_g: number;
          carbs_goal_g: number;
          fat_goal_g: number;
          fiber_goal_g: number;
          water_goal_ml: number;
          height_cm: number | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["nutrition_settings"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["nutrition_settings"]["Row"]>;
        Relationships: [];
      };
      activity_suggestions: {
        Row: {
          id: string;
          user_id: string;
          categories: string[];
          filters: Record<string, unknown>;
          results: Record<string, unknown>[];
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_suggestions"]["Row"]> & {
          user_id: string;
          categories: string[];
          filters: Record<string, unknown>;
          results: Record<string, unknown>[];
        };
        Update: Partial<Database["public"]["Tables"]["activity_suggestions"]["Row"]>;
        Relationships: [];
      };
      saved_activities: {
        Row: {
          id: string;
          user_id: string;
          kind: "place" | "event";
          title: string;
          subtitle: string;
          lat: number;
          lng: number;
          starts_at: string | null;
          data: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["saved_activities"]["Row"]> & {
          user_id: string;
          kind: "place" | "event";
          title: string;
          subtitle: string;
          lat: number;
          lng: number;
          data: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["saved_activities"]["Row"]>;
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: GoalCategory;
          priority: "low" | "medium" | "high";
          status: "active" | "completed" | "archived";
          color: string | null;
          icon: string | null;
          deadline: string | null;
          target_value: number | null;
          current_value: number;
          unit: string | null;
          manual_progress_pct: number | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["goals"]["Row"]> & {
          user_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Row"]>;
        Relationships: [];
      };
      goal_milestones: {
        Row: {
          id: string;
          goal_id: string;
          title: string;
          is_completed: boolean;
          sort_order: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["goal_milestones"]["Row"]> & {
          goal_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["goal_milestones"]["Row"]>;
        Relationships: [];
      };
      task_subtasks: {
        Row: {
          id: string;
          schedule_item_id: string;
          title: string;
          is_completed: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_subtasks"]["Row"]> & {
          schedule_item_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_subtasks"]["Row"]>;
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_food_id: string;
          ingredient_food_id: string | null;
          quantity: number;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["recipe_ingredients"]["Row"]> & {
          recipe_food_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_ingredients"]["Row"]>;
        Relationships: [];
      };
      user_favorite_foods: {
        Row: {
          user_id: string;
          food_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_favorite_foods"]["Row"]> & {
          user_id: string;
          food_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_favorite_foods"]["Row"]>;
        Relationships: [];
      };
      meal_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          meal_type: MealType | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_templates"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_templates"]["Row"]>;
        Relationships: [];
      };
      meal_template_items: {
        Row: {
          id: string;
          template_id: string;
          food_id: string | null;
          quantity: number;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_template_items"]["Row"]> & {
          template_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_template_items"]["Row"]>;
        Relationships: [];
      };
      health_metrics: {
        Row: {
          id: string;
          user_id: string;
          logged_for_date: string;
          sleep_hours: number | null;
          sleep_quality: number | null;
          bedtime: string | null;
          wake_time: string | null;
          steps: number | null;
          calories_burned: number | null;
          resting_heart_rate: number | null;
          avg_heart_rate: number | null;
          active_minutes: number | null;
          exercise_type: string | null;
          exercise_minutes: number | null;
          distance_km: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["health_metrics"]["Row"]> & {
          user_id: string;
          logged_for_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["health_metrics"]["Row"]>;
        Relationships: [];
      };
      coach_insights: {
        Row: {
          id: string;
          user_id: string;
          period: "daily" | "weekly" | "monthly";
          headline: string;
          insights: { title: string; detail: string }[];
          signals: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["coach_insights"]["Row"]> & {
          user_id: string;
          period: "daily" | "weekly" | "monthly";
          headline: string;
          insights: { title: string; detail: string }[];
          signals: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["coach_insights"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
