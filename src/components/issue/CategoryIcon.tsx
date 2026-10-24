import type { ReactNode } from "react";
import type { Category } from "@/lib/constants";
import { CATEGORY_LABELS } from "@/lib/format";

export const CATEGORY_TONE: Record<Category, { dot: string; text: string; tint: string }> = {
  pothole: { dot: "bg-cat-pothole", text: "text-cat-pothole", tint: "bg-cat-pothole/12" },
  garbage: { dot: "bg-cat-garbage", text: "text-cat-garbage", tint: "bg-cat-garbage/12" },
  streetlight: { dot: "bg-cat-streetlight", text: "text-cat-streetlight", tint: "bg-cat-streetlight/14" },
  waterlogging: { dot: "bg-cat-waterlogging", text: "text-cat-waterlogging", tint: "bg-cat-waterlogging/12" },
  sewage: { dot: "bg-cat-sewage", text: "text-cat-sewage", tint: "bg-cat-sewage/12" },
  encroachment: { dot: "bg-cat-encroachment", text: "text-cat-encroachment", tint: "bg-cat-encroachment/12" },
  other: { dot: "bg-cat-other", text: "text-cat-other", tint: "bg-cat-other/12" },
};

// 24px grid, 1.8 stroke, drawn to read at 16px.
const PATHS: Record<Category, ReactNode> = {
  pothole: (
    <>
      <path d="M8.5 3 4 21M15.5 3 20 21" />
      <path d="M12 4v2.5M12 9.5V11" />
      <path d="M8 16.6c.7-1.6 2.6-2.1 4-1.7 1 .3 2-.2 3 .2 1.2.5 1.5 1.8.7 2.6-1 1-3 1.1-4.5.9-1.5.2-2.8 0-3.3-.8-.2-.3-.1-.8.1-1.2Z" />
    </>
  ),
  garbage: (
    <>
      <path d="M4.5 7h15M9.5 7V4.5h5V7" />
      <path d="m6.5 7 1 13h9l1-13" />
      <path d="M10.5 11v5.5M13.5 11v5.5" />
    </>
  ),
  streetlight: (
    <>
      <path d="M8 21V7.5A4.5 4.5 0 0 1 12.5 3H14" />
      <path d="M13.5 3h6v1.5a3 3 0 0 1-6 0V3Z" />
      <path d="M5.5 21h5M16.5 10.5l.5 1.5M19.5 10l1 1.2" />
    </>
  ),
  waterlogging: (
    <>
      <path d="M12 3s-3.2 3.6-3.2 5.8a3.2 3.2 0 0 0 6.4 0C15.2 6.6 12 3 12 3Z" />
      <path d="M3 15.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
      <path d="M3 19.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
    </>
  ),
  sewage: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7.5 9h9M6 12h12M7.5 15h9" />
    </>
  ),
  encroachment: (
    <>
      <path d="M3.5 8.5h17v5h-17z" />
      <path d="m7.5 8.5-4 5M12.5 8.5l-4 5M17.5 8.5l-4 5" />
      <path d="M6 13.5V20M18 13.5V20" />
    </>
  ),
  other: (
    <>
      <path d="M5.5 21V3.5" />
      <path d="M5.5 4h12l-2.5 4 2.5 4h-12" />
    </>
  ),
};

type Props = {
  category: Category;
  // "badge" puts the icon in a tinted circle, like the category legend in the designs.
  variant?: "plain" | "badge";
  className?: string;
};

export function CategoryIcon({ category, variant = "plain", className }: Props) {
  const tone = CATEGORY_TONE[category];
  const svg = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={variant === "badge" ? "size-[55%]" : (className ?? "size-5")}
      role="img"
      aria-label={CATEGORY_LABELS[category]}
    >
      {PATHS[category]}
    </svg>
  );

  if (variant === "plain") return <span className={tone.text}>{svg}</span>;

  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full ${tone.tint} ${tone.text} ${className ?? "size-10"}`}>
      {svg}
    </span>
  );
}
