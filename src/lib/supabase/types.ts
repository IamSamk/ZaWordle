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
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_played_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_played_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_played_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      blitz_scores: {
        Row: {
          id: string;
          user_id: string;
          difficulty: "easy" | "medium" | "hard";
          best_time: number;
          times_achieved: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          difficulty: "easy" | "medium" | "hard";
          best_time: number;
          times_achieved?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          difficulty?: "easy" | "medium" | "hard";
          best_time?: number;
          times_achieved?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      speedrun_scores: {
        Row: {
          id: string;
          user_id: string;
          difficulty: "easy" | "medium" | "hard";
          timer_duration: 60 | 180 | 300;
          word_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          difficulty: "easy" | "medium" | "hard";
          timer_duration: 60 | 180 | 300;
          word_count: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          difficulty?: "easy" | "medium" | "hard";
          timer_duration?: 60 | 180 | 300;
          word_count?: number;
          created_at?: string;
        };
      };
    };
  };
}
