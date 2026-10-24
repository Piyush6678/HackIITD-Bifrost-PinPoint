import type { ComponentProps } from "react";
import { Spinner } from "./Skeleton";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-pine text-white hover:bg-pine-soft",
  accent: "bg-mint text-pine-deep hover:bg-[#19b597]",
  secondary: "border border-line bg-white text-pine hover:border-pine/40 hover:bg-mist",
  ghost: "text-pine hover:bg-mist",
  danger: "bg-brick text-white hover:bg-[#8f332c]",
};

const SIZES: Record<Size, string> = {
  md: "h-10 px-4 text-sm gap-2",
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5",
};

// Exported so links can look like buttons without nesting a <button> in an <a>.
export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `inline-flex shrink-0 items-center justify-center rounded-md font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

type Props = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
