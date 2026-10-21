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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      authors: {
        Row: {
          bio: string
          claimed_by: string | null
          created_at: string
          id: string
          name: string
          name_key: string
          openlibrary_key: string | null
          website: string | null
        }
        Insert: {
          bio?: string
          claimed_by?: string | null
          created_at?: string
          id?: string
          name: string
          name_key: string
          openlibrary_key?: string | null
          website?: string | null
        }
        Update: {
          bio?: string
          claimed_by?: string | null
          created_at?: string
          id?: string
          name?: string
          name_key?: string
          openlibrary_key?: string | null
          website?: string | null
        }
        Relationships: []
      }
      book_authors: {
        Row: {
          author_id: string
          book_id: string
          position: number
        }
        Insert: {
          author_id: string
          book_id: string
          position?: number
        }
        Update: {
          author_id?: string
          book_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_authors_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          category: Database["public"]["Enums"]["book_category"]
          cover_url: string | null
          created_at: string
          dedupe_key: string
          genres: string[]
          id: string
          isbn: string | null
          language: string | null
          openlibrary_key: string | null
          publication_year: number | null
          publisher: string | null
          slug: string
          status: Database["public"]["Enums"]["book_status"]
          submitted_by: string | null
          subtitle: string | null
          synopsis: string
          title: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["book_category"]
          cover_url?: string | null
          created_at?: string
          dedupe_key: string
          genres?: string[]
          id?: string
          isbn?: string | null
          language?: string | null
          openlibrary_key?: string | null
          publication_year?: number | null
          publisher?: string | null
          slug: string
          status?: Database["public"]["Enums"]["book_status"]
          submitted_by?: string | null
          subtitle?: string | null
          synopsis?: string
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["book_category"]
          cover_url?: string | null
          created_at?: string
          dedupe_key?: string
          genres?: string[]
          id?: string
          isbn?: string | null
          language?: string | null
          openlibrary_key?: string | null
          publication_year?: number | null
          publisher?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["book_status"]
          submitted_by?: string | null
          subtitle?: string | null
          synopsis?: string
          title?: string
        }
        Relationships: []
      }
      consensus_questions: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["book_category"]
          id: string
          options: string[]
          prompt: string
          sort: number
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["book_category"]
          id?: string
          options: string[]
          prompt: string
          sort?: number
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["book_category"]
          id?: string
          options?: string[]
          prompt?: string
          sort?: number
        }
        Relationships: []
      }
      consensus_votes: {
        Row: {
          answer: string
          book_id: string
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          book_id: string
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          book_id?: string
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consensus_votes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consensus_votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "consensus_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          expertise: string
          id: string
          is_professional: boolean
          is_suspended: boolean
          is_verified: boolean
          support_url: string | null
          username: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          expertise?: string
          id: string
          is_professional?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          support_url?: string | null
          username: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          expertise?: string
          id?: string
          is_professional?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          support_url?: string | null
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      reading_statuses: {
        Row: {
          book_id: string
          status: Database["public"]["Enums"]["reading_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          status: Database["public"]["Enums"]["reading_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          status?: Database["public"]["Enums"]["reading_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_statuses_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      recometer_votes: {
        Row: {
          book_id: string
          recommend: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          recommend: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          recommend?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recometer_votes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          reason: string
          reporter_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          reason: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      review_comments: {
        Row: {
          body: string
          created_at: string
          has_spoilers: boolean
          id: string
          is_hidden: boolean
          parent_id: string | null
          review_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          has_spoilers?: boolean
          id?: string
          is_hidden?: boolean
          parent_id?: string | null
          review_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          has_spoilers?: boolean
          id?: string
          is_hidden?: boolean
          parent_id?: string | null
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "review_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_likes: {
        Row: {
          created_at: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          affiliate_label: string | null
          affiliate_url: string | null
          body_html: string
          book_id: string
          comment_count: number
          content_warning: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string
          has_spoilers: boolean
          id: string
          is_draft: boolean
          is_featured: boolean
          is_hidden: boolean
          like_count: number
          published_at: string | null
          rating: number | null
          title: string
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          affiliate_label?: string | null
          affiliate_url?: string | null
          body_html?: string
          book_id: string
          comment_count?: number
          content_warning?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          has_spoilers?: boolean
          id?: string
          is_draft?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          like_count?: number
          published_at?: string | null
          rating?: number | null
          title: string
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          affiliate_label?: string | null
          affiliate_url?: string | null
          body_html?: string
          book_id?: string
          comment_count?: number
          content_warning?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          has_spoilers?: boolean
          id?: string
          is_draft?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          like_count?: number
          published_at?: string | null
          rating?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      short_thoughts: {
        Row: {
          body: string
          book_id: string
          created_at: string
          has_spoilers: boolean
          id: string
          is_hidden: boolean
          user_id: string
        }
        Insert: {
          body: string
          book_id: string
          created_at?: string
          has_spoilers?: boolean
          id?: string
          is_hidden?: boolean
          user_id: string
        }
        Update: {
          body?: string
          book_id?: string
          created_at?: string
          has_spoilers?: boolean
          id?: string
          is_hidden?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_thoughts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_thoughts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_consensus: {
        Args: { _book_id: string }
        Returns: {
          answer: string
          question_id: string
          votes: number
        }[]
      }
      get_recometer: {
        Args: { _book_id: string }
        Returns: {
          not_recommend: number
          recommend: number
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_member: { Args: { _uid: string }; Returns: boolean }
      make_dedupe_key: {
        Args: { _author: string; _title: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      book_category: "fiction" | "nonfiction" | "poetry" | "biography" | "other"
      book_status: "pending" | "published" | "rejected"
      reading_status: "want" | "reading" | "read"
      report_status: "open" | "resolved" | "dismissed"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      book_category: ["fiction", "nonfiction", "poetry", "biography", "other"],
      book_status: ["pending", "published", "rejected"],
      reading_status: ["want", "reading", "read"],
      report_status: ["open", "resolved", "dismissed"],
    },
  },
} as const
