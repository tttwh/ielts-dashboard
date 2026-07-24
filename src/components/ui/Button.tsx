import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border-ielts-blue bg-ielts-blue text-white shadow-[0_12px_26px_-18px_rgba(40,85,217,0.78)] hover:bg-blue-700",
  secondary:
    "border-white/75 bg-white/65 text-ink shadow-[0_1px_0_rgba(255,255,255,0.75)_inset] hover:border-blue-200 hover:bg-white/85"
};

export function Button({ children, className = "", type = "button", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-[6px] border px-3 text-sm font-semibold transition duration-150 focus:outline-none focus:ring-2 focus:ring-ielts-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
