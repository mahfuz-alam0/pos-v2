"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { checkOrganization } from "@/services/auth/checkOrganization";
import { loginWithBackendAndPersist, LOGIN_METHODS } from "@/util/use-auth";
import { encryptText, decryptText } from "@/util/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const DEBOUNCE_MS = 500;
const REMEMBER_KEY = "pos-remember";

function loadRemembered() {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(REMEMBER_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [remembered] = useState(loadRemembered);

  const [orgUsername, setOrgUsername] = useState(() => remembered?.orgUsername ?? "");
  const [orgId, setOrgId] = useState(null);
  const [orgChecking, setOrgChecking] = useState(false);
  const [orgError, setOrgError] = useState("");

  const [email, setEmail] = useState(() => remembered?.email ?? "");
  const [password, setPassword] = useState(() =>
    remembered?.password ? decryptText(remembered.password) : ""
  );
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => Boolean(remembered));

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function handleOrgUsernameChange(value) {
    setOrgUsername(value);
    setOrgId(null);
    setOrgError("");
    setOrgChecking(Boolean(value.trim()));
  }

  useEffect(() => {
    const trimmed = orgUsername.trim();
    if (!trimmed) return;

    const timer = setTimeout(async () => {
      try {
        const res = await checkOrganization(trimmed);
        const orgId = res?.data?.orgId ?? null;
        setOrgId(orgId);
        if (!orgId) setOrgError("Organization not found");
      } catch {
        setOrgError("Organization not found");
      } finally {
        setOrgChecking(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [orgUsername]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orgId || submitting) return;

    setSubmitting(true);
    setFormError("");

    try {
      if (remember) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ orgUsername, email, password: encryptText(password) })
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      await loginWithBackendAndPersist({
        orgId,
        email,
        password,
        method: LOGIN_METHODS.EMAIL_PASSWORD,
      });

      const nextRaw = searchParams.get("next") || "/";
      const safeNext = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
      router.push(safeNext);
    } catch (err) {
      setFormError(err.message || "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = orgId && email && password && !submitting;
  const orgSettled = !orgChecking && orgUsername.trim().length > 0;

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-accent">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 0, transparent 45%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="self-start">
            <Image
              src="/logos/bleaum_logo.png"
              alt="Logo"
              width={898}
              height={437}
              className="h-16 w-auto"
              priority
            />
          </div>
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold leading-tight text-white">
              Run your business,
              <br />
              all in one place.
            </h1>
            <p className="mt-4 text-white/60 text-sm leading-relaxed">
              Sales, inventory, and reporting — synced in real time across
              every register in your organization.
            </p>
          </div>
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <Image
              src="/logos/bleaum_logo.png"
              alt="Logo"
              width={898}
              height={437}
              className="h-16 w-auto"
              priority
            />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-heading">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your organization to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="orgUsername" className="mb-1.5 text-text">
                Organization username
              </Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="orgUsername"
                  type="text"
                  value={orgUsername}
                  onChange={(e) => handleOrgUsernameChange(e.target.value)}
                  className="h-11 rounded-lg pl-9 pr-9"
                  placeholder="acme"
                  autoComplete="organization"
                  suppressHydrationWarning
                />
                {orgChecking && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {!orgChecking && orgSettled && orgId && (
                  <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                )}
                {!orgChecking && orgSettled && orgError && (
                  <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                )}
              </div>
              <div className="mt-1.5 min-h-4 text-xs">
                {orgChecking && <span className="text-muted-foreground">Checking…</span>}
                {!orgChecking && orgError && <span className="text-destructive">{orgError}</span>}
                {!orgChecking && orgId && (
                  <span className="text-emerald-600 dark:text-emerald-400">Organization found</span>
                )}
              </div>
            </div>

            <fieldset
              disabled={!orgId}
              className="space-y-4 transition-opacity duration-300 disabled:opacity-40"
            >
              <div>
                <Label htmlFor="email" className="mb-1.5 text-text">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-lg pl-9"
                    placeholder="you@example.com"
                    autoComplete="email"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="mb-1.5 text-text">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-lg pl-9 pr-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(Boolean(checked))}
                />
                Remember me
              </label>
            </fieldset>

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!canSubmit}
              className="group h-11 w-full rounded-lg bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
