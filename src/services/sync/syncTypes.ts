import type { AppState } from "../storage/storageTypes";

export type SyncMode = "guest" | "syncing" | "synced" | "offline" | "error";

export interface SyncState {
  mode: SyncMode;
  message: string | null;
  lastSyncedAt: string | null;
}

export interface SyncResult {
  state: AppState;
  syncState: SyncState;
}
