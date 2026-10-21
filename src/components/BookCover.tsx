import { cn } from "@/lib/utils";

export function BookCover({ src, title, className }: { src?: string | null; title: string; className?: string }) {
  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-sm bg-muted shadow-cover", className)}>
      {src ? (
        <img src={src} alt={`Cover of ${title}`} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-3 text-center font-display text-sm text-muted-foreground">
          {title}
        </div>
      )}
    </div>
  );
}
