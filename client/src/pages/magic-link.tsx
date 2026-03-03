import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Link2 } from "lucide-react";
import { setCsrfToken } from "@/lib/queryClient";

type VerifyState = "verifying" | "success" | "error";

export default function MagicLink() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const [verifyState, setVerifyState] = useState<VerifyState>("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async (magicToken: string) => {
      const res = await fetch("/api/v1/onboarding/verify-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: magicToken }),
        credentials: "include",
      });

      // Capture CSRF token
      const csrf = res.headers.get("X-CSRF-Token");
      if (csrf) {
        setCsrfToken(csrf);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Verification failed");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      setVerifyState("success");
      // Use hard navigation to avoid React routing race condition.
      // The session cookie is already set by the verify-magic-link response,
      // so the target page will load fresh and fetch auth state normally.
      setTimeout(() => {
        const showTour = data.isFirstLogin ? "?showTour=true" : "";
        window.location.href = `/client-portal${showTour}`;
      }, 1000);
    },
    onError: (error: Error) => {
      setVerifyState("error");
      setErrorMessage(error.message);
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate(token);
    } else {
      setVerifyState("error");
      setErrorMessage("No magic link token found. Please check your email for the correct link.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Link2 className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-xl">
            {verifyState === "verifying" && "Signing you in..."}
            {verifyState === "success" && "You're in!"}
            {verifyState === "error" && "Link expired or invalid"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {verifyState === "verifying" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">
                Verifying your magic link...
              </p>
            </div>
          )}

          {verifyState === "success" && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm text-muted-foreground">
                Redirecting to your project dashboard...
              </p>
            </div>
          )}

          {verifyState === "error" && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <Button
                onClick={() => setLocation("/auth/request-link")}
                className="w-full"
              >
                Request a New Link
              </Button>
              <Button
                variant="ghost"
                onClick={() => setLocation("/login")}
                className="text-sm"
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
