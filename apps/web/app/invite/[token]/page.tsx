"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/invite/${token}`);
    }
  }, [status, router, token]);

  async function handleAccept() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/invite/${token}/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Error accepting invitation");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <h1 className="text-center text-2xl font-bold">Invitation</h1>

        {success ? (
          <div className="text-center">
            <p className="text-green-600 font-medium">Invitation accepted!</p>
            <p className="text-sm text-gray-500 mt-1">Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-500">
              You have been invited to join an organization.
            </p>

            {error && <p className="text-center text-sm text-red-500">{error}</p>}

            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "..." : "Accept Invitation"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
