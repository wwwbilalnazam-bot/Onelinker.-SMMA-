"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenSquare,
  CalendarDays,
  BarChart3,
  MessageSquare,
  LayoutList,
  Share2,
  Images,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

// ════════════════════════════════════════════════════════════
// SIDEBAR — collapsible nav with icon + label
// ════════════════════════════════════════════════════════════

export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/home",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Comments",
    href: "/inbox",
    icon: MessageSquare,
  },
  {
    label: "Posts",
    href: "/posts",
    icon: LayoutList,
  },
  {
    label: "Accounts",
    href: "/accounts",
    icon: Share2,
  },
  {
    label: "Media",
    href: "/media",
    icon: Images,
  },
] as const;

export const BOTTOM_ITEMS = [
  {
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;

function NavItem({
  item,
  collapsed,
  active,
  onClick,
}: {
  item: { label: string; href: string; icon: React.ElementType };
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        collapsed && "justify-center px-0 mx-1",
        active
          ? "bg-muted/70 text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:shadow-sm"
      )}
    >
      {/* Active indicator bar */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-foreground" />
      )}

      <item.icon
        className={cn(
          "shrink-0 h-[18px] w-[18px] transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground/60 group-hover:text-foreground"
        )}
      />

      {!collapsed && (
        <span className="truncate leading-none">{item.label}</span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "relative hidden md:flex flex-col border-r border-border/50 bg-card/80 backdrop-blur-md transition-all duration-300 shrink-0",
        collapsed ? "w-[60px]" : "w-60"
      )}
    >
      {/* Logo — fixed height matches header */}
      <div
        className={cn(
          "flex h-14 items-center gap-2.5 px-4 border-b border-border/40",
          collapsed && "justify-center px-0"
        )}
      >
        <Image src="/logo.png" alt="Onelinker" width={28} height={28} className="shrink-0 rounded-lg shadow-glow-sm" />
        {!collapsed && (
          <span className="font-bold text-gradient text-sm tracking-tight">
            Onelinker
          </span>
        )}
      </div>

      {/* Workspace switcher */}
      <div className={cn("px-3 py-2.5 border-b border-border/40", collapsed && "px-2")}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* Create CTA */}
      <div className={cn("px-3 py-2", collapsed && "px-2")}>
        <Link
          href="/create?sheet=true"
          className={cn(
            "btn btn-primary w-full rounded-lg",
            collapsed ? "btn-icon-md justify-center" : "btn-md gap-2"
          )}
        >
          <PenSquare className="h-4 w-4" />
          {!collapsed && <span>New Post</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isActive(item.href, "exact" in item ? item.exact : false)}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-border/40 space-y-0.5">
        {!collapsed && (
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            System
          </p>
        )}
        {BOTTOM_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isActive(item.href)}
          />
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-muted/60 transition-all duration-150 z-10"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════
// MOBILE SIDEBAR — slide-out sheet for small screens
// ════════════════════════════════════════════════════════════

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-sm transition-all duration-150"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-card border-border/50">
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          {/* Logo */}
          <div className="flex h-14 items-center gap-2.5 px-4 border-b border-border/40">
            <Image src="/logo.png" alt="Onelinker" width={28} height={28} className="shrink-0 rounded-lg shadow-glow-sm" />
            <span className="font-bold text-gradient text-sm tracking-tight">
              Onelinker
            </span>
          </div>

          {/* Workspace switcher */}
          <div className="px-3 py-2.5 border-b border-border/40">
            <WorkspaceSwitcher collapsed={false} />
          </div>

          {/* Create CTA */}
          <div className="px-3 py-2">
            <Link
              href="/create?sheet=true"
              onClick={() => setOpen(false)}
              className="btn btn-primary btn-md w-full rounded-lg gap-2"
            >
              <PenSquare className="h-4 w-4" />
              <span>New Post</span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                collapsed={false}
                active={isActive(item.href, "exact" in item ? item.exact : false)}
                onClick={() => setOpen(false)}
              />
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-2 py-3 border-t border-border/40 space-y-0.5">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              System
            </p>
            {BOTTOM_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                collapsed={false}
                active={isActive(item.href)}
                onClick={() => setOpen(false)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
