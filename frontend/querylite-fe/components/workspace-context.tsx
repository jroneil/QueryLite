"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { authenticatedFetch } from "@/lib/api";

interface Member {
    user_id: string;
    email: string;
    role: string;
}

interface Workspace {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    members: Member[];
}

interface WorkspaceContextType {
    activeWorkspaceId: string | null;
    setActiveWorkspaceId: (id: string | null) => void;
    workspaces: Workspace[];
    refreshWorkspaces: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("activeWorkspaceId");
        }
        return null;
    });
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

    const fetchWorkspaces = async () => {
        try {
            const res = await authenticatedFetch("/api/workspaces/");
            if (res.ok) {
                const data = await res.json();
                setWorkspaces(data);
                if (!activeWorkspaceId && data.length > 0) {
                    // Default to personal or first workspace if possible? 
                    // For now, keep it null if not set.
                }
            }
        } catch (error) {
            console.error("Failed to fetch workspaces", error);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    useEffect(() => {
        if (activeWorkspaceId) {
            localStorage.setItem("activeWorkspaceId", activeWorkspaceId);
        } else {
            localStorage.removeItem("activeWorkspaceId");
        }
    }, [activeWorkspaceId]);

    return (
        <WorkspaceContext.Provider value={{
            activeWorkspaceId,
            setActiveWorkspaceId,
            workspaces,
            refreshWorkspaces: fetchWorkspaces
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export const useWorkspaces = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error("useWorkspaces must be used within a WorkspaceProvider");
    }
    return context;
};
