import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider, noFlashThemeScript } from "@/context/theme-context";
import InlineScript from "@/components/InlineScript";
import SettingsPanel from "@/components/settings/SettingsPanel";
import AuthGuard from "@/components/auth/AuthGuard";
import { ShopProvider } from "@/context/shop-context";
import ShopGate from "@/components/shop/ShopGate";
import InitializingScreen from "@/components/InitializingScreen";
import AppShell from "@/components/layout/AppShell";
import { StoreProvider } from "@/store/StoreProvider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Bleaum",
    template: "%s | Bleaum",
  },
  description: "Bleaum",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme="navy"
      data-mode="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript id="no-flash-theme" html={noFlashThemeScript} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <StoreProvider>
            <Suspense fallback={<InitializingScreen />}>
              <AuthGuard>
                <ShopProvider>
                  <ShopGate>
                    <AppShell>{children}</AppShell>
                  </ShopGate>
                </ShopProvider>
              </AuthGuard>
            </Suspense>
            <SettingsPanel />
            <Toaster />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
