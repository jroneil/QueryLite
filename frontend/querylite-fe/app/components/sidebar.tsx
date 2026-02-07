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
  Shield,
  Settings,
  Eye,
  Activity,
  Globe,
  Network,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useWorkspaces } from "@/components/workspace-context";
import { useWorkspaceTheme } from "@/components/workspace-theme-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspaces();
  const { theme } = useWorkspaceTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  // Determine if user is admin in current context
  const currentUserEmail = session?.user?.email;
  const isWorkspaceAdmin = activeWorkspaceId
    ? activeWorkspace?.members.find(m => m.email === currentUserEmail)?.role === "admin"
    : true; // Personal space (null id) is always admin access

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: Home,
    },
    {
      title: "Intelligence",
      href: "/intelligence",
      icon: Eye,
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
    {
      title: "Audit Logs",
      href: "/admin/audit",
      icon: Shield,
      adminOnly: true,
    },
    {
      title: "Data Lineage",
      href: "/intelligence/lineage",
      icon: Network,
      adminOnly: true,
    },
    {
      title: "Compliance",
      href: "/admin/compliance",
      icon: ShieldCheck,
      adminOnly: true,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isWorkspaceAdmin);

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
            <div
              className="absolute -inset-1.5 rounded-xl blur opacity-25 group-hover:opacity-60 transition duration-500"
              style={{ background: `linear-gradient(to tr, ${theme.primary_color}, ${theme.secondary_color})` }}
            />
            <div className="relative h-10 w-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105">
              {theme.logo_url ? (
                <img src={theme.logo_url} alt="Logo" className="h-6 w-6 object-contain" />
              ) : (
                <Zap className="h-6 w-6 text-white" />
              )}
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col animate-in slide-in-from-left-2 duration-500">
              <span className="font-black text-xl text-white tracking-tighter leading-none uppercase">
                {activeWorkspace?.name || "QueryLite"}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Enterprise Nexus</span>
            </div>
          )}
        </div>
      </div>

      {mounted && (
        <>
          {/* Workspace Switcher */}
          {!collapsed && (
            <div className="px-6 py-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5 h-10 rounded-xl px-3 group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs font-bold uppercase tracking-wider">
                        {activeWorkspace?.name || "Select Context"}
                      </span>
                    </div>
                    <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-1 bg-slate-900 border-slate-800 rounded-2xl shadow-2xl z-[100]">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 py-2">Available Nodes</div>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => setActiveWorkspaceId(null)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                        !activeWorkspaceId ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
                      )}
                    >
                      Personal Space
                      {!activeWorkspaceId && <Check className="h-3 w-3" />}
                    </button>
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => setActiveWorkspaceId(ws.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                          activeWorkspaceId === ws.id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
                        )}
                      >
                        <span className="truncate">{ws.name}</span>
                        {activeWorkspaceId === ws.id && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Navigation Layer */}
          <nav className="relative flex-1 py-10 px-4 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {!collapsed && (
              <div className="px-4 mb-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] animate-in fade-in duration-700">
                Core Interface
              </div>
            )}
            {filteredNavItems.map((item) => {
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
                    isActive ? "" : "group-hover:text-slate-300"
                  )} style={{ color: isActive ? theme.primary_color : undefined }}>
                    {isActive && (
                      <div className="absolute -inset-1 blur-md rounded-full opacity-20" style={{ backgroundColor: theme.primary_color }} />
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
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-lg" style={{ backgroundColor: theme.primary_color }} />
                    </div>
                  )}
                </Link>
              );
            })}
            {activeWorkspaceId && isWorkspaceAdmin && !collapsed && (
              <Link
                href={`/workspaces/${activeWorkspaceId}/admin`}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group mt-10 border border-violet-500/10 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10"
                )}
                style={{
                  borderColor: `${theme.primary_color}20`,
                  backgroundColor: `${theme.primary_color}05`,
                  color: theme.primary_color
                }}
              >
                <Shield className="h-5 w-5" />
                <span className="font-black text-[10px] uppercase tracking-[0.2em]">Admin Console</span>
              </Link>
            )}
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
        </>
      )}
    </aside>
  );
}
