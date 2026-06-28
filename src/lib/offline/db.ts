import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface OfflineRequest {
  id: string;
  store_id: string;
  type: "with_deduction" | "without_deduction";
  deducted_employee_id: string | null;
  product_name: string;
  amount: number;
  comment: string;
  photo_path: string;
  photo_blob: Blob;
  category?: "food" | "equipment" | "supplies" | "other";
  has_camera_exif?: boolean | null;
  estimated_cost?: number | null;
  created_at: string;
  retry_count: number;
}

interface WriteoffDB extends DBSchema {
  offline_requests: {
    key: string;
    value: OfflineRequest;
    indexes: { by_created: string };
  };
}

let dbPromise: Promise<IDBPDatabase<WriteoffDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<WriteoffDB>("writeoff-offline", 1, {
      upgrade(db) {
        const store = db.createObjectStore("offline_requests", { keyPath: "id" });
        store.createIndex("by_created", "created_at");
      },
    });
  }
  return dbPromise;
}

export type { OfflineRequest };