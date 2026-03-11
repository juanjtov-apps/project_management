import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

export default function RequestMagicLink() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [, setLocation] = useLocation();

  const requestMutation = useMutation({
    mutationFn: async (emailAddr: string) => {
      // Call both client and sub endpoints in parallel — one will match
      const [clientRes, subRes] = await Promise.all([
        fetch("/api/v1/onboarding/request-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailAddr }),
          credentials: "include",
        }),
        fetch("/api/v1/sub/request-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailAddr }),
          credentials: "include",
        }),
      ]);

      // Check for rate limiting on either
      if (clientRes.status === 429 || subRes.status === 429) {
        throw new Error(t('requestLink.rateLimited'));
      }

      // If both failed, throw error from the client one
      if (!clientRes.ok && !subRes.ok) {
        const data = await clientRes.json().catch(() => ({}));
        throw new Error(data.detail || t('requestLink.error'));
      }

      // Return whichever succeeded
      const successRes = clientRes.ok ? clientRes : subRes;
      return successRes.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      setEmailError(error.message);
    },
  });

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError(t('validation.emailRequired'));
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError(t('validation.emailInvalid'));
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateEmail(email)) {
      requestMutation.mutate(email);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-xl">{t('requestLink.checkEmail')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('requestLink.checkEmailDesc', { email })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('requestLink.linkExpires')}
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
              className="text-sm"
            >
              {t('requestLink.tryDifferent')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-xl">{t('requestLink.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {t('requestLink.subtitle')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('requestLink.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('requestLink.emailPlaceholder')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && (
                <p className="text-xs text-red-500">{emailError}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('requestLink.sending')}
                </>
              ) : (
                t('requestLink.send')
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/login")}
              className="text-sm"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('magicLink.backToLogin')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
