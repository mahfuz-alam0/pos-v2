"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { checkOrganization } from "@/services/auth/checkOrganization";
import { loginWithBackendAndPersist, LOGIN_METHODS } from "@/util/use-auth";
import { encryptText, decryptText } from "@/util/crypto";

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
        const data = await checkOrganization(trimmed);
        setOrgId(data?.orgId ?? null);
        if (!data?.orgId) setOrgError("Organization not found");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-accent px-4">
      <div className="w-full max-w-sm bg-accent border border-white/40 rounded-xl shadow-xl p-8">
        <div className="flex justify-center mb-8">
          <Image
            src="/logos/bleaum_logo.png"
            alt="Logo"
            width={160}
            height={48}
            className="h-12 w-auto"
            priority
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Organization username
            </label>
            <input
              type="text"
              value={orgUsername}
              onChange={(e) => handleOrgUsernameChange(e.target.value)}
              className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="acme"
              autoComplete="organization"
              suppressHydrationWarning
            />
            {orgChecking && (
              <p className="text-xs text-white/60 mt-1">Checking…</p>
            )}
            {!orgChecking && orgError && (
              <p className="text-xs text-red-500 mt-1">{orgError}</p>
            )}
            {!orgChecking && orgId && (
              <p className="text-xs text-primary mt-1">Organization found</p>
            )}
          </div>

          <fieldset disabled={!orgId} className="space-y-4 disabled:opacity-40">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
                autoComplete="email"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 pr-16 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/60 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-white/30"
                suppressHydrationWarning
              />
              Remember me
            </label>
          </fieldset>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md bg-primary text-on-primary py-2 font-medium hover:bg-primary-hover active:bg-primary-active disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
