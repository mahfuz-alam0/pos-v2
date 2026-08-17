import { Suspense } from "react";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider, noFlashThemeScript } from "@/context/theme-context";
import { SettingsProvider } from "@/context/settings-context";
import InlineScript from "@/components/InlineScript";
import SettingsPanel from "@/components/settings/SettingsPanel";
import AuthGuard from "@/components/auth/AuthGuard";
import { ShopProvider } from "@/context/shop-context";
import ShopGate from "@/components/shop/ShopGate";
import InitializingScreen from "@/components/InitializingScreen";
import AppShell from "@/components/layout/AppShell";
import { StoreProvider } from "@/store/StoreProvider";
import { ChatSocketProvider } from "@/context/chat-socket-context";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const noirPro = localFont({
  variable: "--font-noir-pro",
  display: "optional",
  src: [
    { path: "../fonts/noir-pro/NoirPro-Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/noir-pro/NoirPro-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/noir-pro/NoirPro-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/noir-pro/NoirPro-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/noir-pro/NoirPro-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/noir-pro/NoirPro-Heavy.woff2", weight: "900", style: "normal" },
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  display: "optional",
  subsets: ["latin"],
});

const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";
const appName = isTauri ? "Bleaum-POS" : "Bleaum";

export const metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appName,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme="navy"
      data-mode="light"
      suppressHydrationWarning
      className={`${noirPro.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript id="no-flash-theme" html={noFlashThemeScript} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <StoreProvider>
          <ThemeProvider>
            <SettingsProvider>
              <TooltipProvider>
                <Suspense fallback={<InitializingScreen />}>
                  <AuthGuard>
                    <ShopProvider>
                      <ChatSocketProvider>
                        <ShopGate>
                          <AppShell>{children}</AppShell>
                        </ShopGate>
                        <SettingsPanel />
                      </ChatSocketProvider>
                    </ShopProvider>
                  </AuthGuard>
                </Suspense>
                <Toaster />
              </TooltipProvider>
            </SettingsProvider>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
