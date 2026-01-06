import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { gsap } from "gsap";

// Landing page sections
import {
  HeroSection,
  ProblemReframeSection,
  HowItWorksSection,
  IntelligenceEvolutionSection,
  ValueShiftSection,
  TrustSection,
  FinalCTASection,
} from "@/components/landing";

export default function Landing() {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    role: "",
    phone: "",
    message: ""
  });

  const handleSignIn = useCallback(() => {
    window.location.href = "/login";
  }, []);

  const handleRequestDemo = useCallback(() => {
    setShowWaitlistModal(true);
  }, []);

  const handleSeeHowItWorks = useCallback(() => {
    // Smooth scroll to operating system section
    const targetSection = document.getElementById('operating-system');
    if (targetSection) {
      gsap.to(window, {
        duration: 1.2,
        scrollTo: { y: targetSection, offsetY: 80 },
        ease: 'power2.inOut'
      });
    }
  }, []);

  const handleSubmitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Welcome to the waitlist!",
          description: result.message,
        });
        setShowWaitlistModal(false);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          company: "",
          role: "",
          phone: "",
          message: ""
        });
      } else {
        throw new Error(result.detail || "Failed to join waitlist");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join waitlist. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Register GSAP ScrollTo plugin on mount
  useEffect(() => {
    // Dynamically import ScrollToPlugin
    import('gsap/ScrollToPlugin').then(({ ScrollToPlugin }) => {
      gsap.registerPlugin(ScrollToPlugin);
    });
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F1115' }}>
      {/* Section 1: Hero */}
      <HeroSection
        onRequestDemo={handleRequestDemo}
        onSeeHowItWorks={handleSeeHowItWorks}
        onSignIn={handleSignIn}
      />

      {/* Section 2: Problem Reframe */}
      <ProblemReframeSection />

      {/* Section 3: How It Works */}
      <div id="operating-system">
        <HowItWorksSection />
      </div>

      {/* Section 4: Intelligence Evolution */}
      <IntelligenceEvolutionSection />

      {/* Section 5: Value Shift (Before/After) */}
      <ValueShiftSection />

      {/* Section 6: Trust & Credibility */}
      <TrustSection />

      {/* Section 7+8: Final CTA and Footer */}
      <FinalCTASection onRequestDemo={handleRequestDemo} />

      {/* Waitlist Modal */}
      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent
          className="sm:max-w-md border"
          style={{
            backgroundColor: '#161B22',
            borderColor: '#2D333B',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(74, 222, 128, 0.1)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              Join the Waitlist
            </DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF' }}>
              See how Proesphere can transform your project management. We'll reach out within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitWaitlist} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" style={{ color: '#9CA3AF' }}>First Name *</Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="border"
                  style={{
                    backgroundColor: '#1F242C',
                    borderColor: '#2D333B',
                    color: '#FFFFFF'
                  }}
                  placeholder="John"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" style={{ color: '#9CA3AF' }}>Last Name *</Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="border"
                  style={{
                    backgroundColor: '#1F242C',
                    borderColor: '#2D333B',
                    color: '#FFFFFF'
                  }}
                  placeholder="Smith"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: '#9CA3AF' }}>Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border"
                style={{
                  backgroundColor: '#1F242C',
                  borderColor: '#2D333B',
                  color: '#FFFFFF'
                }}
                placeholder="john@company.com"
                data-testid="input-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company" style={{ color: '#9CA3AF' }}>Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="border"
                  style={{
                    backgroundColor: '#1F242C',
                    borderColor: '#2D333B',
                    color: '#FFFFFF'
                  }}
                  placeholder="Acme Construction"
                  data-testid="input-company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" style={{ color: '#9CA3AF' }}>Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="border"
                  style={{
                    backgroundColor: '#1F242C',
                    borderColor: '#2D333B',
                    color: '#FFFFFF'
                  }}
                  placeholder="Project Manager"
                  data-testid="input-role"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" style={{ color: '#9CA3AF' }}>Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border"
                style={{
                  backgroundColor: '#1F242C',
                  borderColor: '#2D333B',
                  color: '#FFFFFF'
                }}
                placeholder="+1 (555) 000-0000"
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" style={{ color: '#9CA3AF' }}>How can Proesphere help you?</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="border resize-none"
                style={{
                  backgroundColor: '#1F242C',
                  borderColor: '#2D333B',
                  color: '#FFFFFF'
                }}
                placeholder="Tell us about your construction management needs..."
                rows={3}
                data-testid="input-message"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-semibold py-3 rounded-lg transition-all duration-300"
              style={{
                backgroundColor: '#4ADE80',
                color: '#0F1115'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(74, 222, 128, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
              data-testid="button-submit-waitlist"
            >
              {isSubmitting ? "Submitting..." : "Join the Waitlist"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
