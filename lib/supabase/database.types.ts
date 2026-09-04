export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Database contract matching the checked-in Supabase migration.
 * Regenerate this file with the Supabase CLI after future schema changes.
 */
export type Database = {
  public: {
    Tables: {
      courses: {
        Row: {
          code: string | null;
          created_at: string;
          dedupe_key: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          category: string;
          completed: boolean;
          created_at: string;
          description: string | null;
          due_date: string;
          due_time: string | null;
          id: string;
          migration_key: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          completed?: boolean;
          created_at?: string;
          description?: string | null;
          due_date: string;
          due_time?: string | null;
          id?: string;
          migration_key?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category?: string;
          completed?: boolean;
          created_at?: string;
          description?: string | null;
          due_date?: string;
          due_time?: string | null;
          id?: string;
          migration_key?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [key: string]: never;
    };
    Functions: {
      [key: string]: never;
    };
    Enums: {
      task_priority: "low" | "medium" | "high";
    };
    CompositeTypes: {
      [key: string]: never;
    };
  };
};

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];
