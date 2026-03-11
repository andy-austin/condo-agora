"use client";

import React from "react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

type Step = "identifier" | "otp";
type Channel = "whatsapp" | "email";

export default function LoginPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [step, setStep] = useState<Step>("identifier");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isPhone = channel === "whatsapp";

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
    } catch {
      setError(t("login.errorConnection"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("otp", {
        identifier,
        code,
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
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <h1 className="text-center text-2xl font-bold">Condo Agora</h1>

        {step === "identifier" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  isPhone
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  !isPhone
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                Email
              </button>
            </div>

            <input
              type={isPhone ? "tel" : "email"}
              placeholder={isPhone ? "+56 9 1234 5678" : "email@example.com"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-3 dark:border-gray-600 dark:bg-gray-700"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "..." : t("login.sendCode")}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500 dark:bg-gray-800">
                  {t("login.or")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full rounded-lg border py-3 font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {t("login.signInWithGoogle")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-center text-sm text-gray-500">
              {t("login.codeSentTo")} <strong>{identifier}</strong>
            </p>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
              className="w-full rounded-lg border px-4 py-3 text-center text-2xl tracking-widest dark:border-gray-600 dark:bg-gray-700"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "..." : t("login.verify")}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("identifier");
                setCode("");
                setError("");
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              {t("login.back")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
