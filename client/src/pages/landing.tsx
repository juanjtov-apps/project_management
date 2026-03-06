import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// V5 landing styles
import "@/styles/landing.css";

// V5 landing sections
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { Marquee } from "@/components/landing/Marquee";
import { StatementSection } from "@/components/landing/StatementSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { AISection } from "@/components/landing/AISection";
import { GaugesSection } from "@/components/landing/GaugesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { CustomCursor } from "@/components/landing/CustomCursor";
import { useScrollReveal } from "@/components/landing/ScrollReveal";

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
    message: "",
  });

  // Initialize scroll reveal observer
  useScrollReveal();

  const handleSignIn = useCallback(() => {
    window.location.href = "/login";
  }, []);

  const handleGetStarted = useCallback(() => {
    setShowWaitlistModal(true);
  }, []);

  const handleSubmitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Welcome to the waitlist!",
          description: result.message,
        });
        setShowWaitlistModal(false);
        setFormData({ firstName: "", lastName: "", email: "", company: "", role: "", phone: "", message: "" });
      } else {
        throw new Error(result.detail || "Failed to join waitlist");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join waitlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="landing-page">
      <CustomCursor />
      <ScrollProgress />
      <LandingNav onSignIn={handleSignIn} onGetStarted={handleGetStarted} />

      <HeroSection onGetStarted={handleGetStarted} />
      <Marquee />
      <StatementSection />
      <FeaturesSection />
      <AISection />
      <GaugesSection />
      <TestimonialsSection />
      <PricingSection onGetStarted={handleGetStarted} />
      <CTASection onGetStarted={handleGetStarted} />
      <LandingFooter />

      {/* Waitlist Modal */}
      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent
          className="sm:max-w-md border"
          style={{
            backgroundColor: "#161B22",
            borderColor: "#2D333B",
            boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(74, 222, 128, 0.1)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold" style={{ color: "#FFFFFF" }}>
              Join the Waitlist
            </DialogTitle>
            <DialogDescription style={{ color: "#9CA3AF" }}>
              See how Proesphere can transform your project management. We'll reach out within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitWaitlist} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" style={{ color: "#9CA3AF" }}>First Name *</Label>
                <Input id="firstName" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="border" style={{ backgroundColor: "#1F242C", borderColor: "#2D333B", color: "#FFFFFF" }} placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" style={{ color: "#9CA3AF" }}>Last Name *</Label>
                <Input id="lastName" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="border" style={{ backgroundColor: "#1F242C", borderColor: "#2D333B", color: "#FFFFFF" }} placeholder="Smith" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: "#9CA3AF" }}>Email *</Label>
              <Input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="border" style={{ backgroundColor: "#1F242C", borderColor: "#2D333B", color: "#FFFFFF" }} placeholder="john@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company" style={{ color: "#9CA3AF" }}>Company</Label>
                <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="border" style={{ backgroundColor: "#1F242C", borderColor: "#2D333B", color: "#FFFFFF" }} placeholder="Acme Construction" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" style={{ color: "#9CA3AF" }}>Role</Label>
                <Input id="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="border" style={{ backgroundColor: "#1F242C", borderColor: "#2D333B", color: "#FFFFFF" }} placeholder="Project Manager" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" style={{ color: "#9CA3AF" }}>Phone</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="border" style={{ backgroundColor: "#1F242C", borderColor: "#2D333B", color: "#FFFFFF" }} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" style={{ color: "#9CA3AF" }}>How can Proesphere help you?</Label>
              <Textarea id="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="border resize-none" style={{ backgroundColor: "#1F242C", borderColor: "#2D333B", color: "#FFFFFF" }} placeholder="Tell us about your construction management needs..." rows={3} />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-semibold py-3 rounded-lg transition-all duration-300"
              style={{ backgroundColor: "#4ADE80", color: "#0F1115" }}
            >
              {isSubmitting ? "Submitting..." : "Join the Waitlist"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
