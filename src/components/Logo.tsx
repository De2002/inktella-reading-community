import logoLight from "@/assets/logo-light.png.asset.json";
import logoDark from "@/assets/logo-dark.png.asset.json";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <>
      <img src={logoLight.url} alt="Inktella" className={`${className} dark:hidden`} />
      <img src={logoDark.url} alt="" aria-hidden className={`${className} hidden dark:block`} />
    </>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4" role="status" aria-label="Loading">
      <div className="animate-pulse">
        <Logo className="h-20 w-20" />
      </div>
      <p className="text-sm text-muted-foreground">Opening the pages…</p>
    </div>
  );
}
