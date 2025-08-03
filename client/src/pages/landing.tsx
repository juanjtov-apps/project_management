import { Building2, Shield, Users, BarChart3, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
          <Button 
            onClick={handleSignIn}
            className="bg-[var(--proesphere-deep-blue)] hover:bg-[var(--proesphere-graphite)] text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Sign In
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-[var(--proesphere-deep-blue)] mb-6 leading-tight">
            360° 
            <span className="text-[var(--proesphere-teal)]">
              Project Management
            </span>
          </h2>
          <p className="text-xl text-[var(--proesphere-graphite)] mb-8 max-w-2xl mx-auto">
            Build Smarter. Deliver On Time, On-Budget and with the highest quality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleSignIn}
              size="lg"
              className="bg-[var(--proesphere-deep-blue)] hover:bg-[var(--proesphere-graphite)] text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-2 border-[var(--proesphere-teal)] text-[var(--proesphere-teal)] hover:bg-[var(--proesphere-teal)] hover:text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 text-lg"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-[var(--proesphere-deep-blue)] mb-16">
            Built for Construction Excellence
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--proesphere-deep-blue)] mb-4">
                  Advanced Security
                </h4>
                <p className="text-[var(--proesphere-graphite)] opacity-80">
                  Enterprise-grade security with role-based access control for your team and projects.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-graphite)] p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--proesphere-deep-blue)] mb-4">
                  Team Collaboration
                </h4>
                <p className="text-[var(--proesphere-graphite)] opacity-80">
                  Real-time collaboration tools for crews, managers, and subcontractors.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--proesphere-deep-blue)] mb-4">
                  Analytics & Insights
                </h4>
                <p className="text-[var(--proesphere-graphite)] opacity-80">
                  Comprehensive project analytics and performance tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-graphite)] p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--proesphere-deep-blue)] mb-4">
                  Task Management
                </h4>
                <p className="text-[var(--proesphere-graphite)] opacity-80">
                  Intelligent task assignment and progress tracking for all project phases.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-r from-[var(--proesphere-deep-blue)] to-[var(--proesphere-graphite)] py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Why Construction Professionals Choose Proesphere
            </h3>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="bg-[var(--proesphere-teal)] p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">95%</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Project Efficiency</h4>
                <p className="text-[var(--proesphere-mist)] opacity-90">Average improvement in project completion times</p>
              </div>
              <div className="text-center">
                <div className="bg-[var(--proesphere-teal)] p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">24/7</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Real-time Updates</h4>
                <p className="text-[var(--proesphere-mist)] opacity-90">Continuous project monitoring and notifications</p>
              </div>
              <div className="text-center">
                <div className="bg-[var(--proesphere-teal)] p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">100%</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Secure & Reliable</h4>
                <p className="text-[var(--proesphere-mist)] opacity-90">Enterprise-grade security and 99.9% uptime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-[var(--proesphere-deep-blue)] mb-6">
            Ready to Transform Your Construction Projects?
          </h3>
          <p className="text-xl text-[var(--proesphere-graphite)] opacity-80 mb-8">
            Join thousands of construction professionals who trust Proesphere for their project management needs.
          </p>
          <Button 
            onClick={handleSignIn}
            size="lg"
            className="bg-gradient-to-r from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] hover:from-[var(--proesphere-deep-blue)] hover:to-[var(--proesphere-teal)] text-white font-semibold px-12 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--proesphere-mist)] py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-8 h-8 relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] shadow-lg flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white opacity-30 absolute top-1 left-2"></div>
                <div className="text-white font-bold text-sm">P</div>
              </div>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] bg-clip-text text-transparent">
              Proesphere
            </h1>
          </div>
          <p className="text-[var(--proesphere-graphite)] opacity-80">
            © 2025 Proesphere. All rights reserved. Built for construction excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}