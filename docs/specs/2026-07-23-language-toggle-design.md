# IELTS Dashboard Language Toggle Design

## Goal

Add a compact Chinese/English switch for all visible dashboard copy while keeping user data, local persistence, and the current visual layout intact.

## Scope

- Add a `中 / Eng` toggle in the summary header.
- Default to English.
- Persist the selected language in `localStorage` under `ielts-dashboard-language`.
- Translate visible UI text, form labels, button text, status text, heatmap labels, achievement display text, and primary accessibility labels.
- Keep numeric values, dates, record schema, storage keys for study data, and sync-ready data models unchanged.

## Architecture

- Use a local, dependency-free i18n layer in `src/i18n`.
- `I18nProvider` owns language state and exposes `language`, `setLanguage`, and the active translation object.
- Components consume translations through `useI18n()`.
- Stored achievement names/descriptions remain schema data; `RewardsPanel` displays localized names/descriptions by achievement id.

## UI

- The toggle appears in the summary header beside the local-mode badge.
- It uses two compact segmented buttons: `中` and `Eng`.
- The active language is visually highlighted with IELTS blue/purple accents.

## Verification

- Unit tests cover provider persistence and language switching.
- App/component tests verify default English and Chinese-visible copy.
- E2E verifies the toggle works, layout remains within desktop/mobile viewports, and console errors remain absent.
