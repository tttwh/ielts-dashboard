import type { I18nText } from "../../i18n/translations";
import type { SyncState } from "./syncTypes";

type Translation = I18nText;

export const syncLabel = (t: Translation, syncState: SyncState) => {
  switch (syncState.mode) {
    case "syncing":
      return t.sync.syncing;
    case "synced":
      return t.sync.synced;
    case "offline":
      return t.sync.offline;
    case "error":
      return t.sync.error;
    case "guest":
    default:
      return t.sync.guest;
  }
};

export const syncMessage = (t: Translation, syncState: SyncState) =>
  syncState.code ? t.sync.messages[syncState.code] : syncState.message;
