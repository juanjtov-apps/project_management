import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Lock,
  User,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, setCsrfToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PageState = "loading" | "invalid" | "form" | "submitting" | "success";

export default function OnboardCompany() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState<"invite" | "reset">("invite");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Extract token from URL
  const token = new URLSearchParams(window.location.search).get("token") || "";

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      return;
    }

    fetch(`/api/v1/beta/verify-token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setEmail(data.email);
          setPurpose(data.purpose || "invite");
          setPageState("form");
        } else {
          setPageState("invalid");
        }
      })
      .catch(() => {
        setPageState("invalid");
      });
  }, [token]);

  // Password strength checks
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
  };
  const passwordStrong = Object.values(passwordChecks).every(Boolean);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (purpose === "invite") {
      if (!firstName.trim()) newErrors.firstName = "First name is required";
      if (!lastName.trim()) newErrors.lastName = "Last name is required";
      if (!companyName.trim()) newErrors.companyName = "Company name is required";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!passwordStrong) {
      newErrors.password =
        "Password must be at least 8 characters with uppercase, lowercase, and a digit";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Setup mutation (new company + admin)
  const setupMutation = useMutation({
    mutationFn: async () => {
      const endpoint =
        purpose === "invite"
          ? "/api/v1/beta/complete-setup"
          : "/api/v1/beta/complete-reset";

      const body =
        purpose === "invite"
          ? {
              token,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              company_name: companyName.trim(),
              password,
            }
          : { token, password };

      const response = await apiRequest(endpoint, {
        method: "POST",
        body,
      });

      const csrfToken = response.headers.get("X-CSRF-Token");
      if (csrfToken) {
        setCsrfToken(csrfToken);
      }

      return response.json();
    },
    onSuccess: async () => {
      setPageState("success");
      await queryClient.invalidateQueries({ queryKey: ["/api/v1/auth/user"] });
      // Hard navigate to avoid React routing race condition
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    },
    onError: (error: any) => {
      const message =
        error.message || "Something went wrong. Please try again.";
      toast({
        title: "Setup Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setupMutation.mutate();
    }
  };

  // --- Render States ---

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-[var(--pro-bg-deep)] grid place-items-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--pro-text-secondary)] text-sm">
            Verifying your invitation...
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen bg-[var(--pro-bg-deep)] grid place-items-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-[var(--pro-mint)] to-[var(--pro-mint-dim)] opacity-5 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-[var(--pro-orange)] to-[var(--pro-mint)] opacity-5 blur-3xl"></div>
        </div>
        <Card className="w-full max-w-md border-[var(--pro-border)] bg-[var(--pro-surface)]/90 backdrop-blur-xl shadow-2xl relative z-10">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="flex items-center justify-center">
              <Logo variant="full" size="lg" />
            </div>
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-xl text-[var(--pro-text-primary)]">
              Link expired or invalid
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 px-8 pb-8">
            <p className="text-[var(--pro-text-secondary)] text-sm">
              This invitation link has expired, already been used, or is
              invalid. Please contact your administrator for a new invitation.
            </p>
            <Button
              onClick={() => (window.location.href = "/login")}
              variant="outline"
              className="border-[var(--pro-border)] text-[var(--pro-text-primary)]"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-[var(--pro-bg-deep)] grid place-items-center p-6">
        <Card className="w-full max-w-md border-[var(--pro-border)] bg-[var(--pro-surface)]/90 backdrop-blur-xl shadow-2xl">
          <CardContent className="text-center space-y-4 py-12 px-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--pro-text-primary)]">
              {purpose === "invite"
                ? "Your account is ready!"
                : "Password updated!"}
            </h2>
            <p className="text-[var(--pro-text-secondary)] text-sm">
              Redirecting you to your dashboard...
            </p>
            <div className="w-6 h-6 border-2 border-[var(--pro-mint)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Main Form ---

  const isResetMode = purpose === "reset";
  const isFormValid = isResetMode
    ? password && confirmPassword && passwordStrong && password === confirmPassword
    : firstName && lastName && companyName && password && confirmPassword && passwordStrong && password === confirmPassword;

  return (
    <div className="min-h-screen bg-[var(--pro-bg-deep)] grid place-items-center p-6 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-[var(--pro-mint)] to-[var(--pro-mint-dim)] opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-[var(--pro-orange)] to-[var(--pro-mint)] opacity-5 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-[var(--pro-surface-highlight)] to-transparent opacity-20"></div>
      </div>

      <Card className="w-full max-w-md border-[var(--pro-border)] bg-[var(--pro-surface)]/90 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex items-center justify-center">
            <Logo variant="full" size="lg" />
          </div>
          <CardTitle className="text-2xl text-[var(--pro-text-primary)] font-light">
            {isResetMode ? "Reset your password" : "Set up your company"}
          </CardTitle>
          <p className="text-[var(--pro-text-secondary)] text-sm">
            {isResetMode
              ? "Enter a new password for your account"
              : "Complete your account setup to get started with Proesphere"}
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="text-[var(--pro-text-primary)] font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--pro-mint)]" />
                <Input
                  value={email}
                  readOnly
                  className="pl-12 pr-4 py-3 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-secondary)] rounded-xl min-h-[44px] cursor-not-allowed"
                />
              </div>
            </div>

            {/* Setup-only fields */}
            {!isResetMode && (
              <>
                {/* First & Last Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[var(--pro-text-primary)] font-medium">
                      First name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--pro-mint)]" />
                      <Input
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          setErrors((prev) => ({ ...prev, firstName: "" }));
                        }}
                        placeholder="John"
                        className={`pl-12 pr-4 py-3 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-primary)] placeholder:text-[var(--pro-text-secondary)]/50 focus:border-[var(--pro-mint)] rounded-xl min-h-[44px] ${
                          errors.firstName
                            ? "border-[var(--pro-red)]"
                            : ""
                        }`}
                        required
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-xs text-[var(--pro-red)] flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--pro-text-primary)] font-medium">
                      Last name
                    </Label>
                    <Input
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setErrors((prev) => ({ ...prev, lastName: "" }));
                      }}
                      placeholder="Doe"
                      className={`px-4 py-3 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-primary)] placeholder:text-[var(--pro-text-secondary)]/50 focus:border-[var(--pro-mint)] rounded-xl min-h-[44px] ${
                        errors.lastName
                          ? "border-[var(--pro-red)]"
                          : ""
                      }`}
                      required
                    />
                    {errors.lastName && (
                      <p className="text-xs text-[var(--pro-red)] flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label className="text-[var(--pro-text-primary)] font-medium">
                    Company name
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--pro-mint)]" />
                    <Input
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setErrors((prev) => ({ ...prev, companyName: "" }));
                      }}
                      placeholder="Your Construction Co."
                      className={`pl-12 pr-4 py-3 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-primary)] placeholder:text-[var(--pro-text-secondary)]/50 focus:border-[var(--pro-mint)] rounded-xl min-h-[44px] ${
                        errors.companyName
                          ? "border-[var(--pro-red)]"
                          : ""
                      }`}
                      required
                    />
                  </div>
                  {errors.companyName && (
                    <p className="text-xs text-[var(--pro-red)] flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.companyName}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-[var(--pro-text-primary)] font-medium">
                {isResetMode ? "New password" : "Password"}
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--pro-mint)]" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="Create a strong password"
                  className={`pl-12 pr-12 py-3 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-primary)] placeholder:text-[var(--pro-text-secondary)]/50 focus:border-[var(--pro-mint)] rounded-xl min-h-[44px] ${
                    errors.password
                      ? "border-[var(--pro-red)]"
                      : ""
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--pro-text-secondary)] hover:text-[var(--pro-mint)] focus:outline-none rounded p-1 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-[var(--pro-red)] flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}

              {/* Password strength indicators */}
              {password && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                  {[
                    { key: "length", label: "8+ characters" },
                    { key: "uppercase", label: "Uppercase" },
                    { key: "lowercase", label: "Lowercase" },
                    { key: "digit", label: "Number" },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className={`flex items-center gap-1.5 text-xs ${
                        passwordChecks[key as keyof typeof passwordChecks]
                          ? "text-green-500"
                          : "text-[var(--pro-text-secondary)]"
                      }`}
                    >
                      {passwordChecks[key as keyof typeof passwordChecks] ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-current" />
                      )}
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label className="text-[var(--pro-text-primary)] font-medium">
                Confirm password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--pro-mint)]" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  placeholder="Re-enter your password"
                  className={`pl-12 pr-12 py-3 bg-[var(--pro-surface-highlight)] border-[var(--pro-border)] text-[var(--pro-text-primary)] placeholder:text-[var(--pro-text-secondary)]/50 focus:border-[var(--pro-mint)] rounded-xl min-h-[44px] ${
                    errors.confirmPassword
                      ? "border-[var(--pro-red)]"
                      : ""
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--pro-text-secondary)] hover:text-[var(--pro-mint)] focus:outline-none rounded p-1 transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-[var(--pro-red)] flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full font-semibold py-3 rounded-xl bg-gradient-to-r from-[var(--pro-mint)] to-[var(--pro-mint-dim)] text-[var(--pro-bg-deep)] hover:opacity-90 transition-all duration-300 shadow-lg shadow-[var(--pro-mint)]/20 hover:shadow-xl hover:shadow-[var(--pro-mint)]/30 mt-6 min-h-[44px] active:scale-[0.98]"
              disabled={setupMutation.isPending || !isFormValid}
            >
              {setupMutation.isPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-[var(--pro-bg-deep)] border-t-transparent rounded-full animate-spin"></div>
                  <span>
                    {isResetMode
                      ? "Updating password..."
                      : "Creating your account..."}
                  </span>
                </div>
              ) : isResetMode ? (
                "Reset Password"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
