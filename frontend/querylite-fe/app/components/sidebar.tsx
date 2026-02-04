"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  Home,
  MessageSquareText,
  ChevronLeft,
  ChevronRight,
  Zap,
  History,
  Heart,
  LogOut,
  Calendar,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { signOut } from "next-auth/react";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Dashboards",
    href: "/dashboards",
    icon: LayoutDashboard,
  },
  {
    title: "Data Sources",
    href: "/data-sources",
    icon: Database,
  },
  {
    title: "Ask Query",
    href: "/ask",
    icon: MessageSquareText,
  },
  {
    title: "History",
    href: "/history",
    icon: History,
  },
  {
    title: "Saved Queries",
    href: "/saved",
    icon: Heart,
  },
  {
    title: "Scheduled Reports",
    href: "/scheduled",
    icon: Calendar,
  },
  {
    title: "Workspaces",
    href: "/workspaces",
    icon: Zap,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-slate-950 border-r border-white/5 transition-all duration-500 relative z-50",
        collapsed ? "w-[72px]" : "w-72"
      )}
    >
      {/* Background Gradient Accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Brand Header */}
      <div className="relative flex items-center h-20 px-6 border-b border-white/5">
        <div className={cn("flex items-center gap-4 transition-all duration-500", collapsed && "justify-center w-full ml-0")}>
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-60 transition duration-500" />
            <div className="relative h-10 w-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105">
              <Zap className="h-6 w-6 text-white" />
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col animate-in slide-in-from-left-2 duration-500">
              <span className="font-black text-xl text-white tracking-tighter leading-none">
                QUERY<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">LITE</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Foundry v1.1</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Layer */}
      <nav className="relative flex-1 py-10 px-4 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {!collapsed && (
          <div className="px-4 mb-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] animate-in fade-in duration-700">
            Core Interface
          </div>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative",
                isActive
                  ? "bg-white/5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
              )}
            >
              <div className={cn(
                "relative transition-all duration-300",
                isActive ? "text-violet-400" : "group-hover:text-slate-300"
              )}>
                {isActive && (
                  <div className="absolute -inset-1 bg-violet-500/20 blur-md rounded-full" />
                )}
                <item.icon
                  className={cn(
                    "h-5 w-5 relative z-10 transition-transform group-hover:scale-110 duration-300"
                  )}
                />
              </div>

              {!collapsed && (
                <span className={cn(
                  "font-bold text-sm tracking-tight transition-all duration-300",
                  isActive ? "translate-x-0" : "translate-x-0 group-hover:translate-x-1"
                )}>
                  {item.title}
                </span>
              )}

              {isActive && !collapsed && (
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Actionable Footer */}
      <div className="relative p-6 space-y-4">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

        <Button
          variant="ghost"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center h-10 rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-white transition-all shadow-inner"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4 mr-2" />}
          {!collapsed && <span className="text-[10px] font-black uppercase tracking-widest">Collapse Nexus</span>}
        </Button>

        <Button
          variant="ghost"
          onClick={() => signOut()}
          className={cn(
            "w-full flex items-center gap-4 h-12 rounded-2xl transition-all duration-300",
            collapsed ? "justify-center" : "px-4 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500/80 hover:text-rose-400 border border-rose-500/10 hover:border-rose-500/30"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="font-bold text-sm tracking-tight">Deauthorize</span>}
        </Button>
      </div>

    </aside>
  );
}
