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
      // Invalidate the auth user query to refetch user data
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6">
      {/* Back to Landing Button */}
      <Button 
        onClick={() => setLocation("/")}
        variant="ghost"
        className="absolute top-6 left-6 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Landing
      </Button>
      
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] shadow-lg flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-white opacity-30 absolute top-2 left-3"></div>
                <div className="text-white font-bold text-lg">P</div>
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] bg-clip-text text-transparent">
              Proesphere
            </h1>
          </div>
          <CardTitle className="text-xl text-[var(--proesphere-deep-blue)]">
            Sign in to your account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-blue-900">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-600" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-blue-200 focus:border-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-900">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-600" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 border-blue-200 focus:border-blue-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-800 hover:bg-blue-900 text-white"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Demo Accounts:</p>
                <div className="space-y-1 text-xs">
                  <p><strong>Sarah Johnson:</strong> sarah@towerflow.com / password123</p>
                  <p><strong>Mike Chen:</strong> mike@towerflow.com / password123</p>
                  <p><strong>Lisa Rodriguez:</strong> lisa@towerflow.com / password123</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}