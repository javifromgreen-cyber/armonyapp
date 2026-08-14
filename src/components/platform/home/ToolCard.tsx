import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PlatformTool } from "@/platform/tools";
import { ToolCardVisual } from "./ToolCardVisual";

/**
 * One catalogue card (product-spec.md §11). Deliberately generic — reads
 * all copy from `platform.tools.<id>` so a second future app slots in
 * without a new component. Armony intentionally gets no special full-width
 * treatment: it renders at the same visual scale future cards will use.
 */
export async function ToolCard({ tool }: { tool: PlatformTool }) {
  const t = await getTranslations(`platform.tools.${tool.id}`);
  const concepts = t.raw("concepts") as string[];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-ona-border bg-ona-surface">
      <ToolCardVisual />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h3 className="text-xl font-semibold text-ona-fg">{t("name")}</h3>
        <p className="text-sm text-ona-fg-muted">{t("description")}</p>
        <ul className="flex flex-wrap gap-2">
          {concepts.map((concept) => (
            <li
              key={concept}
              className="rounded-full border border-ona-border px-3 py-1 text-xs text-ona-fg-muted"
            >
              {concept}
            </li>
          ))}
        </ul>
        <Link
          href={{ pathname: "/sign-in", query: { from: tool.id } }}
          className="mt-auto inline-flex w-fit items-center gap-1 text-sm font-medium text-ona-accent transition-opacity hover:opacity-80"
        >
          {t("cta")} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
