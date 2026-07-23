"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/context/sidebar-context";
import { PUBLIC_PATHS } from "@/components/auth/AuthGuard";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublicPath) return children;

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-surface">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
