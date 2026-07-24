import type { ReactNode } from "react";

type BadgeTone = "neutral" | "blue" | "purple" | "success";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

const tones: Record<BadgeTone, string> = {
  neutral: "border-white/70 bg-white/60 text-muted",
  blue: "border-blue-200/80 bg-blue-50/80 text-ielts-blue",
  purple: "border-purple-200/80 bg-purple-50/80 text-ielts-purple",
  success: "border-emerald-200/80 bg-emerald-50/80 text-emerald-700"
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center whitespace-normal break-words rounded-full border px-2 py-0.5 text-xs font-medium leading-5 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
