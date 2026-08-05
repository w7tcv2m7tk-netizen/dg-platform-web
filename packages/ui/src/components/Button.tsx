import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-500 shadow-sm font-semibold",
  secondary:
    "border border-slate-600 text-slate-200 hover:border-slate-500 hover:text-white font-medium",
  ghost: "text-slate-300 hover:bg-slate-900 hover:text-white",
};

const sizeClass: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-full transition ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
