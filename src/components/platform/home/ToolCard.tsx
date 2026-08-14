import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PlatformTool } from "@/platform/tools";
import type { PlatformAccess } from "@/platform/access";
import { ToolCardVisual } from "./ToolCardVisual";

/**
 * One catalogue card (product-spec.md §11/§16, ONA Functional Phase 1).
 * Deliberately generic — reads all copy from `platform.tools.<id>` so a
 * second future app slots in without a new component. The CTA now reflects
 * REAL platform access rather than always linking to sign-in: signed-out
 * visitors still go through sign-in (carrying `returnTo=<tool.route>`);
 * a trialing user opens the tool directly; an expired user is sent to the
 * Trial Ended experience — never a fake "purchase" (Stripe is a later
 * phase).
 */
export async function ToolCard({
  tool,
  access,
}: {
  tool: PlatformTool;
  access: PlatformAccess | null;
}) {
  const t = await getTranslations(`platform.tools.${tool.id}`);
  const concepts = t.raw("concepts") as string[];

  const { href, label } = ctaFor(tool, access, t);

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
          href={href}
          className="mt-auto inline-flex w-fit items-center gap-1 text-sm font-medium text-ona-accent transition-opacity hover:opacity-80"
        >
          {label} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

function ctaFor(
  tool: PlatformTool,
  access: PlatformAccess | null,
  t: Awaited<ReturnType<typeof getTranslations<`platform.tools.${string}`>>>,
): { href: string | { pathname: string; query: Record<string, string> }; label: string } {
  if (!access) {
    return { href: { pathname: "/sign-in", query: { returnTo: tool.route } }, label: t("cta") };
  }
  if (access.entitlements.status === "expired") {
    return { href: "/trial-ended", label: t("ctaGoPro") };
  }
  return { href: tool.route, label: t("ctaOpen") };
}
