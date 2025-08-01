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
            <div className="bg-gradient-to-br from-blue-800 to-blue-900 p-2 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
              Tower Flow
            </h1>
          </div>
          <Button 
            onClick={handleSignIn}
            className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Sign In
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-blue-900 mb-6 leading-tight">
            Sophisticated Construction
            <span className="block bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
              Project Management
            </span>
          </h2>
          <p className="text-xl text-blue-700 mb-8 max-w-2xl mx-auto">
            Streamline your construction projects with intelligent task tracking, 
            real-time collaboration, and comprehensive resource management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleSignIn}
              size="lg"
              className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 text-lg"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-blue-900 mb-16">
            Built for Construction Excellence
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-blue-900 mb-4">
                  Advanced Security
                </h4>
                <p className="text-blue-700">
                  Enterprise-grade security with role-based access control for your team and projects.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-blue-800 to-blue-900 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-blue-900 mb-4">
                  Team Collaboration
                </h4>
                <p className="text-blue-700">
                  Real-time collaboration tools for crews, managers, and subcontractors.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-blue-900 mb-4">
                  Analytics & Insights
                </h4>
                <p className="text-blue-700">
                  Comprehensive project analytics and performance tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-blue-800 to-blue-900 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-blue-900 mb-4">
                  Task Management
                </h4>
                <p className="text-blue-700">
                  Intelligent task assignment and progress tracking for all project phases.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-r from-blue-800 to-blue-900 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Why Construction Professionals Choose Tower Flow
            </h3>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="bg-emerald-600 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">95%</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Project Efficiency</h4>
                <p className="text-gray-300">Average improvement in project completion times</p>
              </div>
              <div className="text-center">
                <div className="bg-emerald-600 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">24/7</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">Real-time Updates</h4>
                <p className="text-gray-300">Continuous project monitoring and notifications</p>
              </div>
              <div className="text-center">
                <div className="bg-emerald-600 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
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
          <h3 className="text-3xl md:text-4xl font-bold text-blue-900 mb-6">
            Ready to Transform Your Construction Projects?
          </h3>
          <p className="text-xl text-blue-700 mb-8">
            Join thousands of construction professionals who trust Tower Flow for their project management needs.
          </p>
          <Button 
            onClick={handleSignIn}
            size="lg"
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-12 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-100 py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="bg-gradient-to-br from-blue-800 to-blue-900 p-2 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
              Tower Flow
            </h1>
          </div>
          <p className="text-blue-700">
            © 2025 Tower Flow. All rights reserved. Built for construction excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}