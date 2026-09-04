"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  MessageSquare,
  CreditCard,
  Building2,
  FolderOpen,
  BookOpen,
  LogOut,
  Menu,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEncryption } from "@/components/security/encryption-provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Plan } from "@/lib/plan-limits";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
];

const llcNavItems = [
  { label: "Overview", segment: "", icon: Building2 },
  { label: "Documents", segment: "/documents", icon: FolderOpen },
  { label: "Calendar", segment: "/calendar", icon: CalendarDays },
  { label: "Filings", segment: "/filings", icon: FileText },
  { label: "Assistant", segment: "/assistant", icon: MessageSquare },
  { label: "Course", segment: "/course", icon: BookOpen },
];

type DashboardShellProps = {
  children: React.ReactNode;
  plan: Plan;
  userName: string;
  isAdmin?: boolean;
};

type NavContentProps = {
  llcId?: string;
  mobile?: boolean;
  pathname: string;
  plan: Plan;
  userName: string;
  isAdmin: boolean;
  onSignOut: () => void;
};

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-all duration-150",
        isActive
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground/70 group-hover:text-muted-foreground"
        )}
        strokeWidth={isActive ? 2 : 1.5}
      />
      {label}
    </Link>
  );
}

function DashboardNavContent({
  llcId,
  mobile = false,
  pathname,
  plan,
  userName,
  isAdmin,
  onSignOut,
}: NavContentProps) {
  return (
    <>
      <nav className={cn("flex-1 space-y-0.5 px-2", mobile && "px-0")}>
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href}
          />
        ))}

        {llcId && (
          <>
            <div className="px-3 pb-1.5 pt-6">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
                Workspace
              </p>
            </div>
            {llcNavItems.map((item) => {
              const href = `/dashboard/llc/${llcId}${item.segment}`;
              return (
                <NavItem
                  key={href}
                  href={href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === href}
                />
              );
            })}
          </>
        )}
      </nav>

      <div
        className={cn(
          "border-t border-border px-2 pt-3 pb-3",
          mobile && "px-0 pt-4"
        )}
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-foreground text-background text-xs font-semibold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{userName}</p>
            <p className="text-[11px] text-muted-foreground">
              {isAdmin
                ? "Admin"
                : plan
                  ? `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`
                  : "No plan"}
            </p>
          </div>
        </div>
        <button
          className="mt-1 flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </>
  );
}

export function DashboardShell({
  children,
  plan,
  userName,
  isAdmin = false,
}: DashboardShellProps) {
  const pathname = usePathname();
  const { lock } = useEncryption();

  const llcMatch = pathname.match(/\/dashboard\/llc\/([^/]+)/);
  const llcId = llcMatch?.[1];
  const handleSignOut = () => {
    lock();
    signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="text-base font-semibold tracking-tight"
          >
            Pax
          </Link>
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Open navigation"
                />
              }
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-sm px-4 py-5">
              <SheetHeader className="px-0">
                <SheetTitle className="text-base font-semibold tracking-tight">
                  Pax
                </SheetTitle>
                <SheetDescription>
                  Navigate your compliance workspace.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex h-full flex-col">
                <DashboardNavContent
                  llcId={llcId}
                  mobile
                  pathname={pathname}
                  plan={plan}
                  userName={userName}
                  isAdmin={isAdmin}
                  onSignOut={handleSignOut}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-61px)] lg:h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 border-r border-border bg-background lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="flex items-center gap-2 px-5 py-5">
            <Link
              href="/dashboard"
              className="text-base font-semibold tracking-tight"
            >
              Pax
            </Link>
            <span className="inline-flex items-center bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Beta
            </span>
          </div>
          <DashboardNavContent
            llcId={llcId}
            pathname={pathname}
            plan={plan}
            userName={userName}
            isAdmin={isAdmin}
            onSignOut={handleSignOut}
          />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:h-screen lg:overflow-y-auto lg:px-10 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
