const inputSurfaceClassName =
  "border border-slate-300 bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] outline-none transition focus:border-ielts-blue focus:ring-2 focus:ring-blue-200";

export const textInputClassName =
  `mt-1 h-9 w-full min-w-0 rounded-[6px] ${inputSurfaceClassName} px-2.5 text-sm font-semibold text-ink`;

export const selectInputClassName =
  `mt-1 h-10 w-full min-w-0 rounded-[6px] ${inputSurfaceClassName} px-2 text-sm font-semibold text-ink`;

export const timerMinuteInputClassName =
  `mt-1 h-10 w-full max-w-[7rem] min-w-0 rounded-[6px] ${inputSurfaceClassName} px-2 font-mono text-sm font-semibold text-ink`;

export const numberFieldInputBaseClassName =
  `h-9 min-w-0 max-w-[9.5rem] flex-1 ${inputSurfaceClassName} px-2 font-mono text-sm font-semibold text-ink`;

export const numberFieldSuffixClassName =
  "flex h-9 shrink-0 items-center rounded-r-[6px] border border-l-0 border-slate-300 bg-white px-2 text-xs font-medium text-muted";
