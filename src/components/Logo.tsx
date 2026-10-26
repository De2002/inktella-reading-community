import { logoLight, logoDark } from "@/assets/brand";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <>
      <img src={logoLight} width={80} height={80} decoding="sync" alt="Inktella" className={`${className} shrink-0 object-contain dark:hidden`} />
      <img src={logoDark} width={80} height={80} decoding="sync" alt="" aria-hidden className={`${className} shrink-0 object-contain hidden dark:block`} />
    </>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4" role="status" aria-label="Loading">
      <div className="motion-safe:animate-pulse">
        <Logo className="h-20 w-20" />
      </div>
      <p className="text-sm text-muted-foreground">Opening the pages…</p>
    </div>
  );
}
