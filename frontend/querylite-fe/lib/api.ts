import { getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function authenticatedFetch(path: string, options: RequestInit = {}) {
  const session = await getSession();
  const accessToken = (session as any)?.accessToken;

  const headers = {
    ...options.headers,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    "Content-Type": "application/json",
  };

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Handle unauthorized - maybe redirect to login?
    // In many cases, next-auth middleware will handle this
  }

  return response;
}
