import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarRange, Home, List, Plus, ScanLine, Settings } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useT } from "@/lib/i18n-hook";
import { cn } from "@/lib/utils";

function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
    >
      <ScanLine className="size-4" />
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useT();
  const nav = [
    { to: "/", label: t("navHome"), icon: Home, primary: false },
    { to: "/transactions", label: t("navList"), icon: List, primary: false },
    { to: "/new", label: t("navAdd"), icon: Plus, primary: true },
    { to: "/plan", label: t("navPlan"), icon: CalendarRange, primary: false },
    { to: "/settings", label: t("navSettings"), icon: Settings, primary: false },
  ] as const;

  return (
    <div className="min-h-dvh bg-background text-foreground md:flex">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <Mark className="size-9" />
          <div>
            <p className="font-display text-lg leading-tight">{t("appName")}</p>
            <p className="text-xs text-muted-foreground">{t("appTag")}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
                  item.primary
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.primary ? t("navAddFull") : item.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-5 py-4 text-xs text-muted-foreground">{t("storedLocal")}</p>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm md:hidden">
          <Mark className="size-8" />
          <p className="font-display text-base">{t("appName")}</p>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 md:max-w-5xl md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <ul className="grid grid-cols-5 px-1 pt-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                    item.primary
                      ? "text-primary"
                      : active
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full",
                      item.primary && "bg-primary text-primary-foreground",
                      !item.primary && active && "bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Toaster />
    </div>
  );
}
