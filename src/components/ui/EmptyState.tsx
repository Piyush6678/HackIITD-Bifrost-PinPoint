import type { ReactNode } from "react";
import { LogoMark } from "../Logo";

type Props = {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, children, action, icon }: Props) {
  return (
    <div className="flex flex-col items-center rounded-card bg-mist px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-white shadow-card">
        {icon ?? <LogoMark size={22} />}
      </span>
      <h3 className="mt-4 font-serif text-lg font-bold text-ink">{title}</h3>
      {children && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
