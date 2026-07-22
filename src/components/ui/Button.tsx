import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "border-ielts-blue bg-ielts-blue text-white hover:bg-blue-700",
  secondary: "border-line bg-white text-ink hover:bg-surface"
};

export function Button({ children, className = "", type = "button", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-[6px] border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
