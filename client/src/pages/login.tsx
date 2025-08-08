import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: credentials,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      // Navigate directly to dashboard after successful login
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      // Better user-friendly error messages
      let errorMessage = "Please check your email and password and try again.";
      
      if (error.message?.includes("Invalid credentials")) {
        errorMessage = "Email or password is incorrect. Please try again.";
      } else if (error.message?.includes("required")) {
        errorMessage = "Both email and password are required.";
      } else if (error.message?.includes("server")) {
        errorMessage = "Unable to connect to the server. Please try again later.";
      }
      
      toast({
        title: "Unable to Sign In",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--proesphere-cloud)] via-[var(--proesphere-mist)] to-[var(--proesphere-cloud)] flex items-center justify-center p-6 relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] opacity-5"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-[var(--proesphere-teal)] to-[var(--proesphere-coral)] opacity-5"></div>
      </div>
      
      {/* Back to Landing Button */}
      <Button 
        onClick={() => setLocation("/")}
        variant="ghost"
        className="absolute top-6 left-6 text-[var(--proesphere-deep-blue)] hover:text-[var(--proesphere-graphite)] hover:bg-[var(--proesphere-mist)] z-10"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Landing
      </Button>
      
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-14 h-14 relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] shadow-xl flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-white opacity-30 absolute top-3 left-4"></div>
                <div className="text-white font-bold text-xl">P</div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] bg-clip-text text-transparent">
              Proesphere
            </h1>
          </div>
          <CardTitle className="text-2xl text-[var(--proesphere-deep-blue)] font-light">
            Welcome back
          </CardTitle>
          <p className="text-[var(--proesphere-graphite)] opacity-70 text-sm">
            Sign in to your account to continue
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-[var(--proesphere-deep-blue)] font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 h-5 w-5 text-[var(--proesphere-teal)]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 pr-4 py-3 border-[var(--proesphere-mist)] focus:border-[var(--proesphere-teal)] focus:ring-[var(--proesphere-teal)] rounded-xl text-[var(--proesphere-graphite)] placeholder:text-[var(--proesphere-graphite)] placeholder:opacity-50"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-[var(--proesphere-deep-blue)] font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-[var(--proesphere-teal)]" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-4 py-3 border-[var(--proesphere-mist)] focus:border-[var(--proesphere-teal)] focus:ring-[var(--proesphere-teal)] rounded-xl text-[var(--proesphere-graphite)] placeholder:text-[var(--proesphere-graphite)] placeholder:opacity-50"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] hover:from-[var(--proesphere-teal)] hover:to-[var(--proesphere-deep-blue)] text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl mt-8"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}