"use client";

import { createContext, useContext, useEffect, useState } from "react";

const SidebarContext = createContext(null);

const TAB_SIZE = 1200; // matches old app's NAV breakpoint
const STORAGE_KEY = "sidebarCollapsed";

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : TAB_SIZE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);

    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = width < TAB_SIZE;

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function toggleMobile() {
    setMobileOpen((prev) => !prev);
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  const value = {
    collapsed: isMobile ? false : collapsed,
    isMobile,
    mobileOpen,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
