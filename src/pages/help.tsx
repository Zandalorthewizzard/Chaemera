import { LeptosRouteHost } from "@/components/leptos/LeptosRouteHost";
import { HelpDialog } from "@/components/HelpDialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function HelpPage() {
  const [isLegacyHelpOpen, setIsLegacyHelpOpen] = useState(false);

  return (
    <LeptosRouteHost routeId="help">
      <div className="mx-auto max-w-5xl px-8 py-6">
        <div className="rounded-2xl border border-border bg-(--background-lightest) p-6">
          <h2 className="text-xl font-semibold">Legacy Help Tools</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Advanced debug bundle export and issue-reporting tools still live in
            the React compatibility layer during the first Leptos cut-in.
          </p>
          <div className="mt-4">
            <Button onClick={() => setIsLegacyHelpOpen(true)}>
              Open Legacy Help Tools
            </Button>
          </div>
        </div>
        <HelpDialog
          isOpen={isLegacyHelpOpen}
          onClose={() => setIsLegacyHelpOpen(false)}
        />
      </div>
    </LeptosRouteHost>
  );
}
