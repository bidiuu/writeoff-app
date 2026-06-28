"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, ClipboardList, LayoutDashboard, BarChart2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface BottomNavProps { role: string; }

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const senderLinks = [
    { href: "/requests/new", label: "Создать", icon: PlusCircle },
    { href: "/requests/my", label: "Заявки", icon: ClipboardList },
    { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  ];
  const reviewerLinks = [
    { href: "/requests/review", label: "Очередь", icon: ClipboardList },
    { href: "/analytics", label: "Аналитика", icon: BarChart2 },
    { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  ];
  const adminLinks = [
    { href: "/requests/review", label: "Очередь", icon: ClipboardList },
    { href: "/analytics", label: "Аналитика", icon: BarChart2 },
    { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  ];

  const links = role === "admin" ? adminLinks : role === "reviewer" ? reviewerLinks : senderLinks;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-border flex items-end justify-around h-16 safe-area-bottom shadow-[0_-1px_0_0_oklch(0.92_0.015_55)]">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-xs px-3 min-h-[44px] flex-1 active:scale-90 transition-all duration-150 relative pb-1",
              active ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary"
                aria-hidden
              />
            )}
            <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </Link>
        );
      })}
      <button
        onClick={handleLogout}
        className="flex flex-col items-center justify-center gap-0.5 text-xs px-3 min-h-[44px] flex-1 text-muted-foreground active:scale-90 transition-all duration-150 pb-1"
      >
        <LogOut size={21} strokeWidth={1.8} />
        Выйти
      </button>
    </nav>
  );
}