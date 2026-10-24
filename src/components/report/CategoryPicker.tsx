import { CATEGORIES, type Category } from "@/lib/constants";
import { CATEGORY_LABELS } from "@/lib/format";
import { CATEGORY_TONE, CategoryIcon } from "../issue/CategoryIcon";

type Props = {
  value: Category | null;
  onChange: (category: Category) => void;
  error?: string;
};

export function CategoryPicker({ value, onChange, error }: Props) {
  return (
    <fieldset aria-describedby={error ? "category-msg" : undefined}>
      <legend className="text-[0.8125rem] font-bold text-ink">Category</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const selected = value === category;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(category)}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[0.8125rem] font-bold transition-colors ${
                selected
                  ? `border-pine ${CATEGORY_TONE[category].tint} text-ink ring-1 ring-pine`
                  : "border-line bg-white text-ink hover:border-pine/40"
              }`}
            >
              <CategoryIcon category={category} className="size-4" />
              {CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>
      {error && (
        <p id="category-msg" className="mt-1.5 text-xs text-brick">
          {error}
        </p>
      )}
    </fieldset>
  );
}
