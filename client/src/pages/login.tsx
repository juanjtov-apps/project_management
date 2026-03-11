import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, setCsrfToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: credentials,
      });

      // Capture CSRF token from response headers for subsequent requests
      const csrfToken = response.headers.get('X-CSRF-Token');
      if (csrfToken) {
        setCsrfToken(csrfToken);
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/v1/auth/user"] });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      let errorMessage = t('login.errorGeneric');

      if (error.message?.includes("Invalid credentials")) {
        errorMessage = t('login.errorInvalid');
      } else if (error.message?.includes("required")) {
        errorMessage = t('login.errorRequired');
      } else if (error.message?.includes("server")) {
        errorMessage = t('login.errorServer');
      }

      toast({
        title: t('login.errorTitle'),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const validateEmail = (email: string) => {
    if (!email) return t('validation.emailRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t('validation.emailInvalid');
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return t('validation.passwordRequired');
    if (password.length < 6) return t('validation.passwordMinLength');
    return "";
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(validatePassword(value));
  };

  const isFormValid = email && password && !emailError && !passwordError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setEmailError(emailErr);
    setPasswordError(passwordErr);

    if (!emailErr && !passwordErr) {
      loginMutation.mutate({ email, password });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--pro-bg-deep)] grid place-items-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-[var(--pro-mint)] to-[var(--pro-mint-dim)] opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-[var(--pro-orange)] to-[var(--pro-mint)] opacity-5 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-[var(--pro-surface-highlight)] to-transparent opacity-20"></div>
      </div>

      {/* Back to Landing Button */}
      <Button
        onClick={() => setLocation("/")}
        variant="ghost"
        className="absolute top-6 left-6 text-[var(--pro-text-secondary)] hover:text-[var(--pro-mint)] hover:bg-[var(--pro-surface-highlight)] z-10 transition-colors"
        data-testid="button-back-landing"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('login.backToLanding')}
      </Button>

      <Card className="w-full max-w-md border-[var(--pro-border)] bg-[var(--pro-surface)]/90 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex items-center justify-center">
            <Logo variant="full" size="lg" />
          </div>
          <CardTitle className="text-2xl text-[var(--pro-text-primary)] font-light">
            {t('login.welcomeBack')}
          </CardTitle>
          <p className="text-[var(--pro-text-secondary)] text-sm">
            {t('login.subtitle')}
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-[var(--pro-text-primary)] font-medium">{t('login.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--pro-mint)]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`pl-12 pr-4 py-3 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-primary)] placeholder:text-[var(--pro-text-secondary)]/50 focus:border-[var(--pro-mint)] focus:ring-[var(--pro-mint)]/20 rounded-xl min-h-[44px] ${
                    emailError ? 'border-[var(--pro-red)] focus:border-[var(--pro-red)]' : ''
                  }`}
                  placeholder={t('login.emailPlaceholder')}
                  autoComplete="username email"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  required
                  data-testid="input-email"
                />
              </div>
              {emailError && (
                <p id="email-error" className="text-sm text-[var(--pro-red)] flex items-center gap-1" data-testid="text-email-error">
                  <AlertCircle className="h-4 w-4" />
                  {emailError}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-[var(--pro-text-primary)] font-medium">{t('login.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--pro-mint)]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`pl-12 pr-12 py-3 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-primary)] placeholder:text-[var(--pro-text-secondary)]/50 focus:border-[var(--pro-mint)] focus:ring-[var(--pro-mint)]/20 rounded-xl min-h-[44px] ${
                    passwordError ? 'border-[var(--pro-red)] focus:border-[var(--pro-red)]' : ''
                  }`}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--pro-text-secondary)] hover:text-[var(--pro-mint)] focus:outline-none focus:ring-2 focus:ring-[var(--pro-mint)]/50 rounded p-1 transition-colors"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-sm text-[var(--pro-red)] flex items-center gap-1" data-testid="text-password-error">
                  <AlertCircle className="h-4 w-4" />
                  {passwordError}
                </p>
              )}
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-[var(--pro-mint)] hover:text-[var(--pro-mint-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--pro-mint)]/50 rounded px-1 py-0.5 transition-colors"
                  onClick={() => {
                    toast({
                      title: t('login.forgotPasswordTitle'),
                      description: t('login.forgotPasswordDesc'),
                      variant: "default",
                    });
                  }}
                  data-testid="button-forgot-password"
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-semibold py-3 rounded-xl bg-gradient-to-r from-[var(--pro-mint)] to-[var(--pro-mint-dim)] text-[var(--pro-bg-deep)] hover:opacity-90 transition-all duration-300 shadow-lg shadow-[var(--pro-mint)]/20 hover:shadow-xl hover:shadow-[var(--pro-mint)]/30 mt-8 min-h-[44px] active:scale-[0.98]"
              disabled={loginMutation.isPending || !isFormValid}
              aria-busy={loginMutation.isPending}
              data-testid="button-submit"
            >
              {loginMutation.isPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-[var(--pro-bg-deep)] border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('login.signingIn')}</span>
                </div>
              ) : (
                t('login.signIn')
              )}
            </Button>
          </form>

          <div className="px-8 pb-6 text-center">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--pro-border)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--pro-surface)] px-2 text-[var(--pro-text-secondary)]">{t('login.or')}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocation("/auth/request-link")}
              className="text-sm text-[var(--pro-mint)] hover:text-[var(--pro-mint-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--pro-mint)]/50 rounded px-2 py-1 transition-colors"
            >
              {t('login.magicLink')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
