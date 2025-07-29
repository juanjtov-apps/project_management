import { Building2, Shield, Users, BarChart3, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-tower-surface via-white to-tower-surface dark:from-tower-surface-dark dark:via-tower-surface dark:to-tower-surface-dark">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-tower-navy to-tower-navy-dark p-2 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-tower-navy to-tower-navy-light bg-clip-text text-transparent">
              Tower Flow
            </h1>
          </div>
          <Button 
            onClick={handleSignIn}
            className="bg-tower-navy hover:bg-tower-navy-dark text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Sign In
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-tower-navy dark:text-white mb-6 leading-tight">
            Sophisticated Construction
            <span className="block bg-gradient-to-r from-tower-emerald to-tower-emerald-light bg-clip-text text-transparent">
              Project Management
            </span>
          </h2>
          <p className="text-xl text-tower-navy-light dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Streamline your construction projects with intelligent task tracking, 
            real-time collaboration, and comprehensive resource management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleSignIn}
              size="lg"
              className="bg-tower-navy hover:bg-tower-navy-dark text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-2 border-tower-emerald text-tower-emerald hover:bg-tower-emerald hover:text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 text-lg"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-tower-navy dark:text-white mb-16">
            Built for Construction Excellence
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-tower-surface-dark">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-tower-emerald to-tower-emerald-dark p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-tower-navy dark:text-white mb-4">
                  Advanced Security
                </h4>
                <p className="text-tower-navy-light dark:text-gray-300">
                  Enterprise-grade security with role-based access control for your team and projects.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-tower-surface-dark">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-tower-navy to-tower-navy-dark p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-tower-navy dark:text-white mb-4">
                  Team Collaboration
                </h4>
                <p className="text-tower-navy-light dark:text-gray-300">
                  Real-time collaboration tools for crews, managers, and subcontractors.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-tower-surface-dark">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-tower-emerald to-tower-emerald-dark p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-tower-navy dark:text-white mb-4">
                  Analytics & Insights
                </h4>
                <p className="text-tower-navy-light dark:text-gray-300">
                  Comprehensive project analytics and performance tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-tower-surface-dark">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-tower-navy to-tower-navy-dark p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-tower-navy dark:text-white mb-4">
                  Task Management
                </h4>
                <p className="text-tower-navy-light dark:text-gray-300">
                  Intelligent task assignment and progress tracking for all project phases.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-r from-tower-navy to-tower-navy-dark py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Why Construction Professionals Choose Tower Flow
            </h3>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="bg-tower-emerald p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">95%</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Project Efficiency</h4>
                <p className="text-gray-300">Average improvement in project completion times</p>
              </div>
              <div className="text-center">
                <div className="bg-tower-emerald p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">24/7</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Real-time Updates</h4>
                <p className="text-gray-300">Continuous project monitoring and notifications</p>
              </div>
              <div className="text-center">
                <div className="bg-tower-emerald p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">100%</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Secure & Reliable</h4>
                <p className="text-gray-300">Enterprise-grade security and 99.9% uptime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-tower-navy dark:text-white mb-6">
            Ready to Transform Your Construction Projects?
          </h3>
          <p className="text-xl text-tower-navy-light dark:text-gray-300 mb-8">
            Join thousands of construction professionals who trust Tower Flow for their project management needs.
          </p>
          <Button 
            onClick={handleSignIn}
            size="lg"
            className="bg-gradient-to-r from-tower-emerald to-tower-emerald-dark hover:from-tower-emerald-dark hover:to-tower-emerald text-white font-semibold px-12 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-tower-surface-dark dark:bg-tower-surface py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="bg-gradient-to-br from-tower-navy to-tower-navy-dark p-2 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-tower-navy to-tower-navy-light bg-clip-text text-transparent">
              Tower Flow
            </h1>
          </div>
          <p className="text-tower-navy-light dark:text-gray-400">
            © 2025 Tower Flow. All rights reserved. Built for construction excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}