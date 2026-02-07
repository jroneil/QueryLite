"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/api";
import { useWorkspaces } from "./workspace-context";

interface ThemeSettings {
    primary_color: string;
    secondary_color: string;
    logo_url: string | null;
    dark_mode: boolean;
}

interface WorkspaceThemeContextType {
    theme: ThemeSettings;
    isLoading: boolean;
    refreshTheme: () => void;
}

const defaultTheme: ThemeSettings = {
    primary_color: "#7c3aed", // Default Violet
    secondary_color: "#4f46e5", // Default Indigo
    logo_url: null,
    dark_mode: true,
};

const WorkspaceThemeContext = createContext<WorkspaceThemeContextType | undefined>(undefined);

export function WorkspaceThemeProvider({
    children
}: {
    children: React.ReactNode;
}) {
    const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
    const [isLoading, setIsLoading] = useState(false);
    const { activeWorkspaceId } = useWorkspaces();

    const fetchTheme = async () => {
        if (!activeWorkspaceId) {
            setTheme(defaultTheme);
            applyTheme(defaultTheme);
            return;
        }
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/workspaces/${activeWorkspaceId}/theme`);
            if (res.ok) {
                const data = await res.json();
                setTheme(data);
                applyTheme(data);
            }
        } catch (error) {
            console.error("Failed to fetch workspace theme", error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyTheme = (t: ThemeSettings) => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        root.style.setProperty("--primary-brand", t.primary_color);
        root.style.setProperty("--secondary-brand", t.secondary_color);

        if (t.dark_mode) {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    };

    useEffect(() => {
        fetchTheme();
    }, [activeWorkspaceId]);

    return (
        <WorkspaceThemeContext.Provider value={{ theme, isLoading, refreshTheme: fetchTheme }}>
            {children}
            <style jsx global>{`
                :root {
                    --primary: ${theme.primary_color};
                    --primary-foreground: 210 40% 98%;
                }
                .bg-violet-600 {
                    background-color: var(--primary-brand) !important;
                }
                .text-violet-400 {
                    color: var(--primary-brand) !important;
                }
                .from-violet-600 {
                    --tw-gradient-from: var(--primary-brand) !important;
                }
                .to-indigo-600 {
                    --tw-gradient-to: var(--secondary-brand) !important;
                }
            `}</style>
        </WorkspaceThemeContext.Provider>
    );
}

export const useWorkspaceTheme = () => {
    const context = useContext(WorkspaceThemeContext);
    if (!context) {
        throw new Error("useWorkspaceTheme must be used within a WorkspaceThemeProvider");
    }
    return context;
};
