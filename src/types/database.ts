export type UserRole = "sender" | "reviewer" | "admin";
export type WriteoffStatus = "pending" | "approved" | "rejected";
export type WriteoffType = "with_deduction" | "without_deduction";
export type IikoStatus = "pending" | "sent" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          store_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          store_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          store_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          name: string;
          iiko_store_id: string | null;
          geo_lat: number | null;
          geo_lng: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          iiko_store_id?: string | null;
          geo_lat?: number | null;
          geo_lng?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          iiko_store_id?: string | null;
          geo_lat?: number | null;
          geo_lng?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      writeoff_requests: {
        Row: {
          id: string;
          store_id: string;
          author_id: string;
          type: WriteoffType;
          deducted_employee_id: string | null;
          comment: string;
          status: WriteoffStatus;
          photo_path: string;
          amount: number;
          product_name: string;
          iiko_doc_number: string | null;
          iiko_status: IikoStatus | null;
          geo_lat: number | null;
          geo_lng: number | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          author_id: string;
          type: WriteoffType;
          deducted_employee_id?: string | null;
          comment: string;
          status?: WriteoffStatus;
          photo_path: string;
          amount: number;
          product_name: string;
          iiko_doc_number?: string | null;
          iiko_status?: IikoStatus | null;
          geo_lat?: number | null;
          geo_lng?: number | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          author_id?: string;
          type?: WriteoffType;
          deducted_employee_id?: string | null;
          comment?: string;
          status?: WriteoffStatus;
          photo_path?: string;
          amount?: number;
          product_name?: string;
          iiko_doc_number?: string | null;
          iiko_status?: IikoStatus | null;
          geo_lat?: number | null;
          geo_lng?: number | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          request_id: string | null;
          actor_id: string | null;
          action: string;
          payload: Record<string, unknown> | null;
          ts: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          actor_id?: string | null;
          action: string;
          payload?: Record<string, unknown> | null;
          ts?: string;
        };
        Update: {
          id?: string;
          request_id?: string | null;
          actor_id?: string | null;
          action?: string;
          payload?: Record<string, unknown> | null;
          ts?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
