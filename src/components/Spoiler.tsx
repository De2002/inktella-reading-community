import { useState, type ReactNode } from "react";
import { EyeOff } from "lucide-react";

export function Spoiler({ active, children }: { active: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  if (!active || shown) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShown(true);
      }}
      className="flex w-full items-center gap-2 rounded-md border border-dashed bg-muted/60 px-3 py-3 text-left text-sm text-muted-foreground hover:bg-muted"
    >
      <EyeOff className="h-4 w-4 shrink-0" />
      Contains spoilers. Tap to reveal.
    </button>
  );
}
