import { useI18n } from "../../i18n/I18nProvider";
import type { Language } from "../../i18n/translations";

const languages: Language[] = ["zh", "en"];

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      aria-label={t.languageToggle.label}
      className="inline-flex h-8 shrink-0 overflow-hidden rounded-[6px] border border-line bg-surface p-0.5"
      role="group"
    >
      {languages.map((nextLanguage) => {
        const isActive = nextLanguage === language;

        return (
          <button
            aria-pressed={isActive}
            className={`min-w-10 rounded-[5px] px-2 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-ielts-blue text-white shadow-sm"
                : "text-muted hover:bg-white hover:text-ink"
            }`}
            key={nextLanguage}
            onClick={() => setLanguage(nextLanguage)}
            type="button"
          >
            {t.languageToggle[nextLanguage]}
          </button>
        );
      })}
    </div>
  );
}
