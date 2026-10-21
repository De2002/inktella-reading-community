import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className="bg-accent font-display text-xs text-accent-foreground">
        {(name || "?").slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
