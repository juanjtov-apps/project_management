import { LayoutDashboard, CalendarRange, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import constructionBg from "@assets/stock_images/construction_site_bu_20bf8193.jpg";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/login";
  };

  const handleStartTrial = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section with Background */}
      <div 
        className="relative min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${constructionBg})`,
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Header */}
        <header className="relative z-20">
          <div className="container mx-auto px-6 py-5">
            <nav className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <Logo size="md" variant="full" />
              </div>
              
              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                  Product
                </a>
                <a href="#features" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                  Features
                </a>
                <a href="#" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                  Design
                </a>
                <a href="#" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                  Contract
                </a>
              </div>
              
              {/* Auth Buttons */}
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost"
                  onClick={handleSignIn}
                  className="text-white/80 hover:text-white hover:bg-white/10 font-medium"
                  data-testid="button-login"
                >
                  Log in
                </Button>
                <Button 
                  onClick={handleStartTrial}
                  className="font-semibold px-5 py-2 rounded-full transition-all duration-200 border-2"
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: '#4ADE80',
                    color: '#4ADE80'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#4ADE80';
                    e.currentTarget.style.color = '#000';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#4ADE80';
                  }}
                  data-testid="button-start-trial-header"
                >
                  Start Free Trial
                </Button>
              </div>
            </nav>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 pt-24 pb-32 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Build Better.
              <br />
              <span className="text-white">Manage Smarter.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              The all-in-one platform for construction project success.
            </p>
            <Button 
              onClick={handleStartTrial}
              size="lg"
              className="font-semibold px-8 py-6 rounded-full transition-all duration-200 text-lg"
              style={{
                backgroundColor: '#4ADE80',
                color: '#000'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#22c55e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4ADE80';
              }}
              data-testid="button-start-trial-hero"
            >
              Start Free Trial
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="relative z-10 container mx-auto px-6 pb-20" id="features">
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Real-time Dashboards Card */}
            <div 
              className="rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02]"
              style={{
                backgroundColor: 'rgba(15, 23, 31, 0.9)',
                borderColor: 'rgba(74, 222, 128, 0.3)',
                boxShadow: '0 0 30px rgba(74, 222, 128, 0.1)'
              }}
            >
              <div className="mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
                >
                  <LayoutDashboard className="h-6 w-6" style={{ color: '#4ADE80' }} />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Real-time Dashboards</h3>
              <p className="text-white/60 text-sm mb-5">
                The all-in-one platform for construction project success.
              </p>
              {/* Dashboard Preview */}
              <div 
                className="rounded-lg p-4 border"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  borderColor: 'rgba(74, 222, 128, 0.2)'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-white/40 text-xs ml-2">Proesphere</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="h-16 rounded" style={{ backgroundColor: 'rgba(74, 222, 128, 0.2)' }} />
                  <div className="h-16 rounded" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }} />
                  <div className="h-16 rounded" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)' }} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-end gap-1 h-12">
                    <div className="w-4 rounded-t" style={{ height: '60%', backgroundColor: '#4ADE80' }} />
                    <div className="w-4 rounded-t" style={{ height: '80%', backgroundColor: '#4ADE80' }} />
                    <div className="w-4 rounded-t" style={{ height: '45%', backgroundColor: '#4ADE80' }} />
                    <div className="w-4 rounded-t" style={{ height: '90%', backgroundColor: '#4ADE80' }} />
                    <div className="w-4 rounded-t" style={{ height: '70%', backgroundColor: '#4ADE80' }} />
                    <div className="w-4 rounded-t" style={{ height: '55%', backgroundColor: '#4ADE80' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Scheduling Card */}
            <div 
              className="rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02]"
              style={{
                backgroundColor: 'rgba(15, 23, 31, 0.9)',
                borderColor: 'rgba(74, 222, 128, 0.3)',
                boxShadow: '0 0 30px rgba(74, 222, 128, 0.1)'
              }}
            >
              <div className="mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
                >
                  <CalendarRange className="h-6 w-6" style={{ color: '#4ADE80' }} />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Smart Scheduling</h3>
              <p className="text-white/60 text-sm mb-5">
                Gantt and Scheduling Gantt, smart project prioritization essential.
              </p>
              {/* Gantt Preview */}
              <div 
                className="rounded-lg p-4 border"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  borderColor: 'rgba(74, 222, 128, 0.2)'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs w-16 truncate">Foundation</span>
                    <div className="flex-1 h-4 rounded" style={{ backgroundColor: '#4ADE80', width: '70%' }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs w-16 truncate">Framing</span>
                    <div className="flex-1 h-4 rounded ml-8" style={{ backgroundColor: '#22d3ee', width: '50%' }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs w-16 truncate">Electrical</span>
                    <div className="flex-1 h-4 rounded ml-16" style={{ backgroundColor: '#facc15', width: '40%' }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs w-16 truncate">Plumbing</span>
                    <div className="flex-1 h-4 rounded ml-20" style={{ backgroundColor: '#4ADE80', width: '35%' }} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-white/30">
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                </div>
              </div>
            </div>

            {/* Field Collaboration Card */}
            <div 
              className="rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02]"
              style={{
                backgroundColor: 'rgba(15, 23, 31, 0.9)',
                borderColor: 'rgba(74, 222, 128, 0.3)',
                boxShadow: '0 0 30px rgba(74, 222, 128, 0.1)'
              }}
            >
              <div className="mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
                >
                  <Users className="h-6 w-6" style={{ color: '#4ADE80' }} />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Field Collaboration</h3>
              <p className="text-white/60 text-sm mb-5">
                Map, media, space link, and messaging UI in no-code zones.
              </p>
              {/* Collaboration Preview */}
              <div 
                className="rounded-lg p-4 border"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  borderColor: 'rgba(74, 222, 128, 0.2)'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-white/40 text-xs ml-2">Messages</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: '#4ADE80' }} />
                    <div className="rounded-lg p-2 text-xs text-white/70" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}>
                      Foundation complete, moving to framing
                    </div>
                  </div>
                  <div className="flex items-start gap-2 justify-end">
                    <div className="rounded-lg p-2 text-xs text-white/70" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                      Great! Materials are ready
                    </div>
                    <div className="w-6 h-6 rounded-full flex-shrink-0 bg-blue-500" />
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 bg-orange-500" />
                    <div className="rounded-lg p-2 text-xs text-white/70" style={{ backgroundColor: 'rgba(251, 146, 60, 0.15)' }}>
                      Inspection scheduled for 2pm
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo size="sm" variant="full" />
            </div>
            <div className="flex items-center gap-6 text-sm text-white/50">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm text-white/40">
              © 2024 Proesphere. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
