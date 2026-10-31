import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { NpsPrompt } from "@/components/nps-prompt";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // The shell reads the URL (pathname, params), which only exists at request time.
  return (
    <Suspense fallback={<p className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-mocha">Brewing…</p>}>
      <AppShell>
        {children}
        <NpsPrompt />
      </AppShell>
    </Suspense>
  );
}
