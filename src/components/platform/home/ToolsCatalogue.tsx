import { getTranslations } from "next-intl/server";
import { platformTools } from "@/platform/tools";
import type { PlatformAccess } from "@/platform/access";
import { ToolCard } from "./ToolCard";

/** product-spec.md §10 — a reusable grid built for multiple future apps; today it renders only Armony. */
export async function ToolsCatalogue({ access }: { access: PlatformAccess | null }) {
  const t = await getTranslations("platform.tools");

  return (
    <section id="tools" className="scroll-mt-20 bg-ona-bg px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-2xl font-semibold text-ona-fg sm:text-3xl">{t("title")}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {platformTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} access={access} />
          ))}
        </div>
      </div>
    </section>
  );
}
