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
  QrCode,
  Delete,
  ChevronDown,
  Check,
  Search,
} from "lucide-react";
import { checkOrganization } from "@/services/auth/checkOrganization";
import { publicListEmployees } from "@/services/auth/publicListEmployees";
import { loginWithBackendAndPersist, LOGIN_METHODS } from "@/util/use-auth";
import { encryptText, decryptText } from "@/util/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import QrScanDialog from "./QrScanDialog";

const DEBOUNCE_MS = 500;
const REMEMBER_KEY = "pos-remember";
const PIN_PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

function loadRemembered() {
  const saved = localStorage.getItem(REMEMBER_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function EmployeeSelect({ employees, loading, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = employees.find((e) => e.id === value);
  const filtered = employees.filter((e) =>
    e.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex h-11 w-full items-center justify-between gap-1.5 rounded-lg border border-white/10 bg-white/6 px-3 text-sm text-white outline-none"
      >
        <span className={selected ? "text-white" : "text-white/25"}>
          {selected ? selected.name : loading ? "Loading employees…" : "Select employee"}
        </span>
        <ChevronDown className="h-4 w-4 text-white/30" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) border-white/10 bg-[#002140] p-1.5"
      >
        <div className="relative mb-1.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <Input
            autoFocus
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-white/10 bg-white/6 pl-8 text-sm text-white placeholder:text-white/25"
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          {!loading && filtered.length === 0 && (
            <div className="py-3 text-center text-sm text-white/35">No employees found</div>
          )}
          {filtered.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => {
                onChange(emp.id);
                setOpen(false);
                setSearch("");
              }}
              className="flex w-full items-center justify-between gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-white/80 hover:bg-white/8"
            >
              <span className="truncate">{emp.name}</span>
              {value === emp.id && <Check className="h-3.5 w-3.5 shrink-0 text-[#038fdd]" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orgUsername, setOrgUsername] = useState("");
  const [orgId, setOrgId] = useState(null);
  const [orgChecking, setOrgChecking] = useState(false);
  const [orgError, setOrgError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const [authMode, setAuthMode] = useState("password"); // "password" | "pin"
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [pin, setPin] = useState("");
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrSubmitting, setQrSubmitting] = useState(false);

  // Hydrate remembered credentials after mount only — reading localStorage
  // during initial render would make SSR/client markup diverge (checkbox
  // checked state, input values) and trigger a hydration mismatch.
  useEffect(() => {
    const remembered = loadRemembered();
    if (!remembered) return;
    setOrgUsername(remembered.orgUsername ?? "");
    setEmail(remembered.email ?? "");
    setPassword(remembered.password ? decryptText(remembered.password) : "");
    setRemember(true);
  }, []);

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

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const res = await checkOrganization(trimmed);
        if (cancelled) return;
        const orgId = res?.data?.orgId ?? null;
        setOrgId(orgId);
        setOrgError(orgId ? "" : "Organization not found");
      } catch {
        if (cancelled) return;
        setOrgId(null);
        setOrgError("Organization not found");
      } finally {
        if (!cancelled) setOrgChecking(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orgUsername]);

  useEffect(() => {
    if (authMode !== "pin" || !orgId) return;
    let cancelled = false;
    setEmployeesLoading(true);
    publicListEmployees(orgId, undefined)
      .then((res) => {
        if (cancelled) return;
        setEmployees(res?.data?.employees ?? []);
      })
      .catch(() => {
        if (!cancelled) setFormError("Failed to load employees");
      })
      .finally(() => {
        if (!cancelled) setEmployeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authMode, orgId]);

  function finishLoginRedirect() {
    const nextRaw = searchParams.get("next") || "/";
    const safeNext = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
    router.replace(safeNext);
  }

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

      finishLoginRedirect();
    } catch (err) {
      setFormError(err.message || "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePinSubmit() {
    if (!selectedEmployeeId || !pin) {
      setFormError("Please select an employee and enter your PIN.");
      return;
    }
    setPinSubmitting(true);
    setFormError("");
    try {
      await loginWithBackendAndPersist({
        orgId,
        accountId: selectedEmployeeId,
        pin,
        method: LOGIN_METHODS.PIN,
      });
      finishLoginRedirect();
    } catch (err) {
      setFormError(err.message || "Sign in failed");
    } finally {
      setPinSubmitting(false);
    }
  }

  function handlePinPadPress(key) {
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
    } else if (key !== "") {
      setPin((p) => p + key);
    }
  }

  async function handleQrScan(text) {
    setQrOpen(false);
    setQrSubmitting(true);
    setFormError("");
    try {
      await loginWithBackendAndPersist({
        qrSession: encryptText(text),
        method: LOGIN_METHODS.QR_CODE,
      });
      finishLoginRedirect();
    } catch (err) {
      setFormError(err.message || "QR sign in failed");
    } finally {
      setQrSubmitting(false);
    }
  }

  const canSubmit = orgId && email && password && !submitting;
  const orgSettled = !orgChecking && orgUsername.trim().length > 0;

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "#001529",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
        backgroundSize: "50px 50px",
      }}
    >
      {/* Center radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(3,143,221,0.13) 0%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div className="relative z-10 mx-4 w-full max-w-sm">
        {/* Logo above card */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logos/bleaum_logo.png"
            alt="Bleaum"
            width={898}
            height={437}
            className="h-12 w-auto"
            priority
          />
        </div>

        <div
          className="rounded-2xl px-8 py-8"
          style={{
            backgroundColor: "#002140",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow:
              "0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(3,143,221,0.08)",
          }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="mt-1 text-sm text-white/45">
              Sign in to your organization to continue.
            </p>
          </div>

          <form
            onSubmit={authMode === "pin" ? (e) => e.preventDefault() : handleSubmit}
            className="space-y-4"
            noValidate
          >
            <div>
              <Label
                htmlFor="orgUsername"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/55"
              >
                Organization username
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    id="orgUsername"
                    type="text"
                    value={orgUsername}
                    onChange={(e) => handleOrgUsernameChange(e.target.value)}
                    className="h-11 rounded-lg border-white/10 bg-white/6 pl-9 pr-9 text-white placeholder:text-white/25 focus-visible:border-[#038fdd] focus-visible:ring-[#038fdd]/20"
                    placeholder="acme"
                    autoComplete="organization"
                    suppressHydrationWarning
                  />
                  {orgChecking && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/30" />
                  )}
                  {!orgChecking && orgSettled && orgId && (
                    <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  )}
                  {!orgChecking && orgSettled && orgError && (
                    <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQrOpen(true)}
                  disabled={qrSubmitting}
                  title="Sign in with QR code"
                  className="h-11 w-11 shrink-0 border-white/10 bg-white/6 p-0 text-white hover:bg-white/12"
                >
                  {qrSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="mt-1.5 min-h-4 text-xs">
                {orgChecking && <span className="text-white/35">Checking…</span>}
                {!orgChecking && orgError && (
                  <span className="text-red-400">{orgError}</span>
                )}
                {!orgChecking && orgId && (
                  <span className="text-emerald-400">Organization found</span>
                )}
              </div>
            </div>

            <fieldset
              disabled={!orgId}
              className="space-y-4 transition-opacity duration-300 disabled:opacity-40"
            >
              {authMode === "password" ? (
                <>
                  <div>
                    <Label
                      htmlFor="email"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/55"
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 rounded-lg border-white/10 bg-white/6 pl-9 text-white placeholder:text-white/25 focus-visible:border-[#038fdd] focus-visible:ring-[#038fdd]/20"
                        placeholder="you@example.com"
                        autoComplete="email"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="password"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/55"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 rounded-lg border-white/10 bg-white/6 pl-9 pr-10 text-white placeholder:text-white/25 focus-visible:border-[#038fdd] focus-visible:ring-[#038fdd]/20"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        suppressHydrationWarning
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-white/50">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(checked) => setRemember(Boolean(checked))}
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setFormError("");
                      setAuthMode("pin");
                    }}
                    className="text-sm text-[#038fdd] hover:underline"
                  >
                    Login using PIN
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/55">
                      Employee
                    </Label>
                    <EmployeeSelect
                      employees={employees}
                      loading={employeesLoading}
                      value={selectedEmployeeId}
                      onChange={setSelectedEmployeeId}
                    />
                  </div>

                  <div>
                    <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/55">
                      PIN
                    </Label>
                    <div className="mb-3 min-h-[44px] select-none rounded-lg border border-white/10 bg-white/6 px-4 py-2.5 text-center text-2xl tracking-[8px] text-white">
                      {pin.length > 0 ? (
                        "●".repeat(pin.length)
                      ) : (
                        <span className="text-sm tracking-normal text-white/25">Enter PIN</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {PIN_PAD_KEYS.map((key, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handlePinPadPress(key)}
                          disabled={key === ""}
                          className={`h-11 rounded-lg border text-base font-semibold transition-transform active:scale-95 ${
                            key === "⌫"
                              ? "border-red-500/30 bg-red-500/10 text-red-400"
                              : key === ""
                              ? "cursor-default border-transparent bg-transparent"
                              : "border-white/10 bg-white/6 text-white hover:bg-white/12"
                          }`}
                        >
                          {key === "⌫" ? <Delete className="mx-auto h-4 w-4" /> : key}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormError("");
                      setPin("");
                      setAuthMode("password");
                    }}
                    className="text-sm text-[#038fdd] hover:underline"
                  >
                    Use Email &amp; Password
                  </button>
                </>
              )}
            </fieldset>

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {authMode === "password" ? (
              <Button
                type="submit"
                disabled={!canSubmit}
                className="group h-11 w-full rounded-lg bg-[#038fdd] text-white hover:bg-[#1f98e3] active:bg-[#0073c4] disabled:opacity-35"
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
            ) : (
              <Button
                type="button"
                onClick={handlePinSubmit}
                disabled={!orgId || !selectedEmployeeId || !pin || pinSubmitting}
                className="group h-11 w-full rounded-lg bg-[#038fdd] text-white hover:bg-[#1f98e3] active:bg-[#0073c4] disabled:opacity-35"
              >
                {pinSubmitting ? (
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
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          © {new Date().getFullYear()} All rights reserved.
        </p>
      </div>

      <QrScanDialog open={qrOpen} onClose={() => setQrOpen(false)} onScan={handleQrScan} />
    </div>
  );
}
