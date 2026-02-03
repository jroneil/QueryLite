import { DashboardLayout } from "@/app/components/layout/dashboard-layout";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
