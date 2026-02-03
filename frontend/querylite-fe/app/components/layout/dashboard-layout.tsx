import { Sidebar } from "@/app/components/sidebar";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="flex h-screen bg-slate-950">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                    {children}
                </div>
            </main>
        </div>
    );
}
