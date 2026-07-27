"use client";

import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { groupsForUser } from "@/lib/selectors";
import { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  Home,
  LayoutGrid,
  LineChart,
  ListTodo,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "../ui/Avatar";
import { IconButton } from "../ui/Button";
import { Logo } from "../ui/Logo";
import { Monogram } from "../ui/Monogram";
import { ThemeToggle } from "../ui/ThemeToggle";
import { NotificationsPanel } from "./NotificationsPanel";
import { ProfileModal } from "./ProfileModal";
import { GlobalSearch } from "./GlobalSearch";
import { CreateGroupModal } from "./CreateGroupModal";
import { Toaster } from "../ui/Toaster";
import { Aurora } from "@/components/motion";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

function navFor(role: Role): NavItem[] {
  if (role === "admin") {
    return [
      { href: "/admin", label: "Umumiy", icon: Home },
      { href: "/admin/users", label: "Foydalanuvchilar", icon: Users },
      { href: "/admin/groups", label: "Guruhlar", icon: LayoutGrid },
    ];
  }
  if (role === "teacher") {
    return [
      { href: "/teacher", label: "Umumiy", icon: Home },
      { href: "/teacher/review", label: "Tekshirish", icon: ClipboardCheck },
      { href: "/teacher/tests", label: "Testlar", icon: FileCheck2 },
      { href: "/teacher/classes", label: "Guruhlar", icon: LayoutGrid },
      { href: "/teacher/calendar", label: "Kalendar", icon: CalendarDays },
    ];
  }
  return [
    { href: "/student", label: "Bugun", icon: Home },
    { href: "/student/assignments", label: "Topshiriqlar", icon: ListTodo },
    { href: "/student/tests", label: "Testlar", icon: FileCheck2 },
    { href: "/student/calendar", label: "Kalendar", icon: CalendarDays },
    { href: "/student/progress", label: "Natijalar", icon: LineChart },
  ];
}

function roleLabel(role: Role): string {
  return role === "admin"
    ? "Administrator"
    : role === "teacher"
    ? "O'qituvchi"
    : "O'quvchi";
}

export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUserId = useSession((s) => s.currentUserId);
  const sessionRole = useSession((s) => s.role);
  const user = useSession((s) => s.user);
  const hydrated = useSession((s) => s.hydrated);
  const refresh = useSession((s) => s.refresh);
  const logout = useSession((s) => s.logout);
  const groups = useData((s) => s.groups);
  const notifications = useData((s) => s.notifications);
  const bootstrap = useData((s) => s.bootstrap);
  const clearData = useData((s) => s.clear);

  const [drawer, setDrawer] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  // confirm session from the server (cookie-based)
  useEffect(() => {
    refresh();
  }, [refresh]);

  // once we know who we are, load this user's data
  useEffect(() => {
    if (hydrated && currentUserId && sessionRole === role) {
      bootstrap();
    }
  }, [hydrated, currentUserId, sessionRole, role, bootstrap]);

  // route guard
  useEffect(() => {
    if (!hydrated) return;
    if (!currentUserId || sessionRole !== role) {
      router.replace("/login");
    }
  }, [hydrated, currentUserId, sessionRole, role, router]);

  useEffect(() => setDrawer(false), [pathname]);
  const myGroups = useMemo(
    () => (user ? groupsForUser(groups, user.id, role) : []),
    [groups, user, role]
  );
  const unread = notifications.filter(
    (n) => n.userId === currentUserId && !n.read
  ).length;

  if (!hydrated || !user || sessionRole !== role) {
    return (
      <div
        data-role={role}
        className="grid min-h-screen place-items-center bg-bg"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Logo showWord={false} />
        </motion.div>
      </div>
    );
  }

  const base =
    role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";
  const nav = navFor(role);

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-3 pt-5">
        <Link href={base} className="inline-flex">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          {nav.map((item) => {
            const active =
              item.href === base
                ? pathname === base
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-ink"
                    : "text-muted hover:bg-elevated hover:text-ink"
                )}
              >
                {active && (
                  <>
                    <motion.span
                      layoutId={`nav-bg-${role}`}
                      className="absolute inset-0 -z-10 rounded-xl border border-accent/20 bg-accent/10 shadow-[0_0_20px_-6px_rgb(var(--accent)/0.5)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                    <motion.span
                      layoutId={`nav-bar-${role}`}
                      className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_10px_rgb(var(--accent)/0.8)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  </>
                )}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] transition-colors",
                    active ? "text-accent" : "text-faint group-hover:text-ink"
                  )}
                  strokeWidth={1.9}
                />
                <span className={cn(active && "font-semibold")}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {role !== "admin" && (
        <div>
          <div className="mb-1 flex items-center justify-between px-3">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
              Guruhlar
              <span className="rounded-full bg-elevated px-1.5 text-[10px] font-medium text-muted">
                {myGroups.length}
              </span>
            </p>
            <button
              onClick={() => setCreateGroupOpen(true)}
              aria-label="Yangi guruh yaratish"
              title="Yangi guruh"
              className="grid h-6 w-6 place-items-center rounded-md text-faint transition-colors hover:bg-elevated hover:text-accent"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-0.5">
            {myGroups.map((g) => {
              const href = `${base}/groups/${g.id}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={g.id}
                  href={href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-elevated text-ink"
                      : "text-muted hover:bg-elevated hover:text-ink"
                  )}
                >
                  <Monogram label={g.subject} size="sm" accent={active} />
                  <span className="truncate font-medium">{g.name}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        )}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-elevated/40 px-2.5 py-2">
          <Avatar user={user} size="sm" />
          <button
            onClick={() => setProfileOpen(true)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-[13px] font-semibold text-ink">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-faint">@{user.email}</p>
          </button>
          <IconButton label="Profil sozlamalari" onClick={() => setProfileOpen(true)}>
            <Settings className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton
            label="Chiqish"
            onClick={async () => {
              await logout();
              clearData();
              router.replace("/login");
            }}
          >
            <LogOut className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
      </div>
    </div>
  );

  return (
    <div data-role={role} className="min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-[264px] overflow-hidden border-r border-border lg:block">
        <Aurora full intensity={0.5} className="opacity-70" />
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="glass-strong absolute inset-y-0 left-0 w-[280px] overflow-hidden border-r border-border"
            >
              <Aurora full intensity={0.5} className="opacity-70" />
              <div className="absolute right-3 top-4">
                <IconButton label="Yopish" onClick={() => setDrawer(false)}>
                  <X className="h-[18px] w-[18px]" />
                </IconButton>
              </div>
              {SidebarBody}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-[264px]">
        {/* Topbar */}
        <header className="glass-strong sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
          <IconButton
            label="Menyu"
            className="lg:hidden"
            onClick={() => setDrawer(true)}
          >
            <Menu className="h-5 w-5" />
          </IconButton>

          <GlobalSearch />

          <div className="flex flex-1 items-center justify-end gap-1 sm:flex-none">
            <div className="relative">
              <IconButton
                label="Bildirishnomalar"
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Bell className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink ring-2 ring-surface">
                    {unread}
                  </span>
                )}
              </IconButton>
              <NotificationsPanel
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
              />
            </div>
            <ThemeToggle />
            <button
              onClick={() => setProfileOpen(true)}
              title="Profil sozlamalari"
              className="ml-1.5 hidden items-center gap-2.5 border-l border-border pl-2.5 transition-opacity hover:opacity-80 sm:flex"
            >
              <div className="text-right leading-tight">
                <p className="text-[12px] font-semibold text-ink">
                  {user.name}
                </p>
                <p className="text-[10px] text-faint">@{user.email}</p>
              </div>
              <Avatar user={user} size="sm" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CreateGroupModal
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
      />
      <Toaster />
    </div>
  );
}
