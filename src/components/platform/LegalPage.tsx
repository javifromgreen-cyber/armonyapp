import { PlatformHeader } from "./PlatformHeader";
import { PlatformFooter } from "./PlatformFooter";

/** Shared shell for the three §15 legal placeholder pages — no production legal copy in this phase. */
export function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="ona-shell flex min-h-full flex-col bg-ona-bg text-ona-fg">
      <PlatformHeader variant="public" />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <h1 className="text-2xl font-semibold text-ona-fg">{title}</h1>
          <p className="text-ona-fg-muted">{body}</p>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
