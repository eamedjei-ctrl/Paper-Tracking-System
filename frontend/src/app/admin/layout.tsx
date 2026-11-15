import type { Metadata } from "next";
import { AdminProvider } from "@/lib/admin";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <AdminProvider>{children}</AdminProvider>; }
