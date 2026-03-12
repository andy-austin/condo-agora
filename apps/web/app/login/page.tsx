"use client";

import React, { useCallback, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Building2, Vote, Users } from "lucide-react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Step = "identifier" | "otp";
type Channel = "whatsapp" | "email";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [step, setStep] = useState<Step>("identifier");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isPhone = channel === "whatsapp";
  const code = digits.join("");

  const handleVerifyOtp = useCallback(
    async (otpCode: string) => {
      setError("");
      setLoading(true);

      try {
        const result = await signIn("otp", {
          identifier,
          code: otpCode,
          redirect: false,
        });

        if (result?.error) {
          setError(t("login.errorInvalidCode"));
          return;
        }

        window.location.href = callbackUrl;
      } catch {
        setError(t("login.errorVerification"));
      } finally {
        setLoading(false);
      }
    },
    [identifier, callbackUrl, t]
  );

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const newCode = newDigits.join("");
    if (newCode.length === 6) {
      handleVerifyOtp(newCode);
    }
  }

  function handleDigitKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);
    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, channel }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || t("login.errorSendingCode"));
        return;
      }

      setStep("otp");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      setError(t("login.errorConnection"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl });
  }

  function handleResendCode() {
    setDigits(["", "", "", "", "", ""]);
    setError("");
    handleRequestOtp({ preventDefault: () => {} } as React.FormEvent);
  }

  const brandFeatures = [
    {
      icon: Vote,
      text: t("login.brandFeature1"),
    },
    {
      icon: Users,
      text: t("login.brandFeature2"),
    },
    {
      icon: Building2,
      text: t("login.brandFeature3"),
    },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative bg-[hsl(25,15%,10%)] flex-col justify-between p-12 xl:p-16 overflow-hidden">
        {/* Decorative geometric pattern */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px]" />

        {/* Top: Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-primary-foreground font-bold text-lg">
                C
              </span>
            </div>
            <span className="text-xl font-bold text-white">Condo Ágora</span>
          </Link>
        </div>

        {/* Center: Brand message */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2
              className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              {t("login.brandTagline")}
            </h2>
            <div className="w-16 h-1 bg-primary rounded-full" />
          </div>

          <div className="space-y-4">
            {brandFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-white/70 text-sm">{feature.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: Social proof */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["M", "C", "A"].map((letter, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-[hsl(25,15%,10%)] bg-white/10 flex items-center justify-center text-xs font-medium text-white/80"
                >
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-white/40 text-sm">200+ buildings trust us</p>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Top bar with language switcher */}
        <div className="flex items-center justify-between p-6">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                C
              </span>
            </div>
            <span className="text-lg font-bold">Condo Ágora</span>
          </Link>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            {step === "identifier" ? (
              <div className="login-step-enter">
                <h1
                  className="text-3xl font-bold mb-2"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                >
                  {t("login.title")}
                </h1>
                <p className="text-muted-foreground mb-8">
                  {t("login.subtitle")}
                </p>

                <form onSubmit={handleRequestOtp} className="space-y-5">
                  {/* Channel toggle */}
                  <div className="flex rounded-xl bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setChannel("whatsapp")}
                      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isPhone
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel("email")}
                      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        !isPhone
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Email
                    </button>
                  </div>

                  {/* Input field */}
                  <div>
                    <input
                      type={isPhone ? "tel" : "email"}
                      placeholder={
                        isPhone ? "+56 9 1234 5678" : "email@example.com"
                      }
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-destructive" />
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <svg
                          className="w-4 h-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="opacity-25"
                          />
                          <path
                            d="M12 2a10 10 0 0 1 10 10"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </svg>
                        ...
                      </span>
                    ) : (
                      t("login.sendCode")
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-background px-4 text-muted-foreground">
                        {t("login.or")}
                      </span>
                    </div>
                  </div>

                  {/* Google sign in */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full rounded-xl border border-border py-3.5 font-medium text-foreground hover:bg-muted/50 transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <GoogleIcon className="w-5 h-5" />
                    {t("login.signInWithGoogle")}
                  </button>
                </form>
              </div>
            ) : (
              <div className="login-step-enter">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => {
                    setStep("identifier");
                    setDigits(["", "", "", "", "", ""]);
                    setError("");
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  {t("login.back")}
                </button>

                <h1
                  className="text-3xl font-bold mb-2"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                >
                  {t("login.enterCode")}
                </h1>
                <p className="text-muted-foreground mb-8">
                  {t("login.codeSentTo")}{" "}
                  <strong className="text-foreground">{identifier}</strong>
                </p>

                {/* OTP digit boxes */}
                <div className="flex gap-2.5 sm:gap-3 mb-6 justify-center">
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl border-2 text-center text-2xl font-bold transition-all duration-200 bg-background
                        ${
                          digit
                            ? "border-primary text-foreground"
                            : "border-border text-foreground"
                        }
                        focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                        placeholder:text-muted-foreground/30`}
                      placeholder="0"
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-destructive flex items-center gap-2 mb-4 justify-center">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => handleVerifyOtp(code)}
                  disabled={loading || code.length < 6}
                  className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98] mb-4"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="opacity-25"
                        />
                        <path
                          d="M12 2a10 10 0 0 1 10 10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      ...
                    </span>
                  ) : (
                    t("login.verify")
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("login.resendCode")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
