import type { AppState } from "../storage/storageTypes";

export type SyncMode = "guest" | "syncing" | "synced" | "offline" | "error";
export type SyncErrorCode =
  | "account-disabled"
  | "account-pending"
  | "foreign-cloud-cache"
  | "cloudbase-api-unavailable";

export interface SyncState {
  mode: SyncMode;
  code?: SyncErrorCode;
  message: string | null;
  lastSyncedAt: string | null;
}

export interface SyncResult {
  state: AppState;
  syncState: SyncState;
}
