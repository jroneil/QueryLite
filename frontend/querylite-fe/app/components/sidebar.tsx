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
        "flex flex-col h-screen bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
          <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg shadow-lg shadow-violet-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              QueryLite
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800",
            collapsed && "hidden"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-gradient-to-r from-violet-600/20 to-indigo-600/20 text-violet-300 shadow-lg shadow-violet-500/5"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                  isActive && "text-violet-400"
                )}
              />
              {!collapsed && (
                <span className="font-medium">{item.title}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      {collapsed && (
        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 w-full text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        {!collapsed && (
          <Button
            variant="ghost"
            onClick={() => signOut()}
            className="w-full flex items-center justify-start gap-3 text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </Button>
        )}
        {!collapsed && (
          <div className="mt-4 text-[10px] text-slate-600 text-center uppercase tracking-widest font-bold">
            QueryLite MVP v1.1
          </div>
        )}
      </div>

    </aside>
  );
}
