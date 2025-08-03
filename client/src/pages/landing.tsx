import { Building2, Shield, Users, BarChart3, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
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
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#product" className="text-slate-600 hover:text-[var(--proesphere-teal)] transition-colors">Product</a>
            <a href="#pricing" className="text-slate-600 hover:text-[var(--proesphere-teal)] transition-colors">Pricing</a>
            <a href="#customers" className="text-slate-600 hover:text-[var(--proesphere-teal)] transition-colors">Customers</a>
            <a href="#resources" className="text-slate-600 hover:text-[var(--proesphere-teal)] transition-colors">Resources</a>
          </div>
          
          <Button 
            onClick={handleSignIn}
            className="bg-[var(--proesphere-deep-blue)] hover:bg-[var(--proesphere-graphite)] text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Sign In
          </Button>
          </nav>
        </div>
      </header>
      
      {/* Spacer for fixed header */}
      <div className="h-20"></div>

      {/* Social Proof Strip */}
      <section className="bg-white/50 py-8 border-b border-slate-200/50">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-[var(--proesphere-deep-blue)] mb-4">
              "Proesphere cut our scheduling calls by 40%" — ACME Builders
            </p>
            <div className="flex items-center justify-center space-x-6 opacity-60">
              <div className="bg-slate-200 px-4 py-1.5 rounded text-sm font-medium">ACME Builders</div>
              <div className="bg-slate-200 px-4 py-1.5 rounded text-sm font-medium">Peak Construction</div>
              <div className="bg-slate-200 px-4 py-1.5 rounded text-sm font-medium">Elite Properties</div>
              <div className="bg-slate-200 px-4 py-1.5 rounded text-sm font-medium">Metro Contractors</div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center" id="product">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg font-medium text-[var(--proesphere-teal)] mb-4">Your Construction Command Center</p>
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
            <div className="flex flex-col items-center">
              <Button 
                onClick={handleSignIn}
                size="lg"
                className="bg-[var(--proesphere-deep-blue)] hover:bg-[var(--proesphere-graphite)] text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-slate-600 mt-2 font-medium">Free 14-day trial. No credit card.</p>
            </div>
            <Button 
              variant="outline"
              size="lg"
              className="border-2 border-[var(--proesphere-teal)] text-[var(--proesphere-teal)] hover:bg-[var(--proesphere-teal)] hover:text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 text-lg hover:shadow-md"
            >
              Learn More
            </Button>
          </div>
          
          {/* Scroll Cue */}
          <div className="mt-12 animate-bounce">
            <p className="text-sm text-slate-600 mb-2">Scroll to see it in action</p>
            <div className="flex justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--proesphere-teal)]">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </div>
          </div>
          
          {/* Hero Visual - Task Dashboard */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200/50 overflow-hidden" style={{boxShadow: '0 16px 32px rgba(0,0,0,0.06)'}}>
              <div className="bg-gradient-to-r from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] h-2"></div>
              <div className="p-6">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800">Task Management Canvas</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-600">Welcome back, Bruce Smith</span>
                    <div className="w-8 h-8 bg-[var(--proesphere-teal)] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">BS</span>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Summary Bar */}
                <div className="bg-[#F8F9FB] border border-slate-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="text-sm text-slate-700">
                        <span className="font-semibold text-[#111827]">61 tasks</span>
                        <span className="mx-2 text-slate-400">|</span>
                        <span className="text-[#E53935] font-normal">12 overdue</span>
                        <span className="mx-2 text-slate-400">|</span>
                        <span className="text-[#FB8C00] font-normal">8 due this week</span>
                        <span className="mx-2 text-slate-400">|</span>
                        <span className="text-[#43A047] font-normal">41 completed</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Project Overview with Color-Coded Progress */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-700">Westfield Mall Renovation</h4>
                      <div className="flex items-center">
                        <div className="w-6 h-1.5 bg-slate-200 rounded-full overflow-hidden mr-2">
                          <div className="h-full bg-[#E53935] rounded-full" style={{width: '25%'}}></div>
                        </div>
                        <span className="text-xs text-slate-500">25%</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">8 overdue • 15 total</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-700">Harbor Bridge Construction</h4>
                      <div className="flex items-center">
                        <div className="w-6 h-1.5 bg-slate-200 rounded-full overflow-hidden mr-2">
                          <div className="h-full bg-[#FB8C00] rounded-full" style={{width: '45%'}}></div>
                        </div>
                        <span className="text-xs text-slate-500">45%</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">3 due today • 22 total</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-700">Residential Complex Phase 2</h4>
                      <div className="flex items-center">
                        <div className="w-6 h-1.5 bg-slate-200 rounded-full overflow-hidden mr-2">
                          <div className="h-full bg-[#43A047] rounded-full" style={{width: '85%'}}></div>
                        </div>
                        <span className="text-xs text-slate-500">85%</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">1 remaining • 24 total</div>
                  </div>
                </div>

                {/* Enhanced Task List with Accessibility Features */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-l-red-500 border-l-2">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="text-red-500 text-sm">⏰</div>
                      <div>
                        <div className="font-medium text-sm text-slate-800">Concrete Foundation - Mall North Wing</div>
                        <div className="text-xs text-[#6B7280]">Assigned to: Mike Johnson • Due: Yesterday</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-red-50 text-[#212121] border-red-300 border-[1.5px] px-2 py-1 rounded">Critical</span>
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-xs font-medium">MJ</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-sm text-slate-800">Bridge Deck Reinforcement Inspection</div>
                        <div className="text-xs text-[#6B7280]">Assigned to: Sarah Chen • Due: Today 3:00 PM</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-amber-50 text-[#212121] border-amber-300 border-[1.5px] px-2 py-1 rounded">Medium</span>
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">SC</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-sm text-slate-800">Residential HVAC System Install - Building C</div>
                        <div className="text-xs text-[#6B7280]">Assigned to: Team Alpha • Due: Tomorrow</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-green-50 text-green-700 border-green-300 border-[1.5px] px-2 py-1 rounded">Low</span>
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-xs font-medium">TA</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" checked readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="text-green-500 text-sm">✔️</div>
                      <div>
                        <div className="font-medium text-sm text-slate-800">Safety Inspection - Mall Level 2</div>
                        <div className="text-xs text-[#6B7280]">Completed by: David Rodriguez • 2 hours ago</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-green-50 text-green-700 border-green-300 border-[1.5px] px-2 py-1 rounded">Completed</span>
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-xs font-medium">DR</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Quick Actions */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex space-x-3">
                    <button className="bg-[var(--proesphere-teal)] text-white text-xs px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-shadow">+ Add Task</button>
                    <button className="bg-slate-100 text-[var(--proesphere-teal)] border border-[var(--proesphere-teal)] text-xs px-4 py-2 rounded-lg font-medium hover:bg-[var(--proesphere-teal)] hover:text-white transition-colors">View Calendar</button>
                    <button className="bg-slate-100 text-slate-700 text-xs px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors">Export Report</button>
                  </div>
                  <div className="text-xs text-[#6B7280]">⌘F focuses search</div>
                </div>
              </div>
            </div>
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
                <div className="bg-gradient-to-br from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--proesphere-deep-blue)] mb-3">
                  Advanced Security
                </h4>
                <p className="text-[var(--proesphere-graphite)] opacity-80 mb-4">
                  Enterprise-grade security with role-based access control.
                </p>
                <a href="#" className="text-[var(--proesphere-teal)] hover:underline text-sm font-medium">
                  Learn more →
                </a>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-graphite)] p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Users className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--proesphere-deep-blue)] mb-3">
                  Team Collaboration
                </h4>
                <p className="text-[var(--proesphere-graphite)] opacity-80 mb-4">
                  Real-time collaboration tools for all stakeholders.
                </p>
                <a href="#" className="text-[var(--proesphere-teal)] hover:underline text-sm font-medium">
                  Learn more →
                </a>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <BarChart3 className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--proesphere-deep-blue)] mb-3">
                  Analytics & Insights
                </h4>
                <p className="text-[var(--proesphere-graphite)] opacity-80 mb-4">
                  Comprehensive project analytics and tracking.
                </p>
                <a href="#" className="text-[var(--proesphere-teal)] hover:underline text-sm font-medium">
                  Learn more →
                </a>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-graphite)] p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--proesphere-deep-blue)] mb-3">
                  Task Management
                </h4>
                <p className="text-[var(--proesphere-graphite)] opacity-80 mb-4">
                  Intelligent task assignment and progress tracking.
                </p>
                <a href="#" className="text-[var(--proesphere-teal)] hover:underline text-sm font-medium">
                  Learn more →
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Case Blocks */}
      <section className="container mx-auto px-6 py-20" id="customers">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-[var(--proesphere-deep-blue)] mb-16">
            Purpose-Built for Construction Teams
          </h3>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-gradient-to-br from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] rounded-xl p-8 mb-6">
                <h4 className="text-xl font-semibold text-white mb-4">Scheduling</h4>
                <div className="bg-white/20 rounded-lg p-4 text-white text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Foundation</span><span>Mon-Wed</span></div>
                    <div className="flex justify-between"><span>Framing</span><span>Thu-Fri</span></div>
                    <div className="flex justify-between"><span>Electrical</span><span>Next Week</span></div>
                  </div>
                </div>
              </div>
              <p className="text-slate-600">Eliminate scheduling conflicts with visual timeline management</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] rounded-xl p-8 mb-6">
                <h4 className="text-xl font-semibold text-white mb-4">Cost Control</h4>
                <div className="bg-white/20 rounded-lg p-4 text-white text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Budget:</span><span>$125,000</span></div>
                    <div className="flex justify-between"><span>Spent:</span><span>$89,500</span></div>
                    <div className="flex justify-between"><span>Remaining:</span><span className="text-green-300">$35,500</span></div>
                  </div>
                </div>
              </div>
              <p className="text-slate-600">Track project costs in real-time with automated budget alerts</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] rounded-xl p-8 mb-6">
                <h4 className="text-xl font-semibold text-white mb-4">Field Reporting</h4>
                <div className="bg-white/20 rounded-lg p-4 text-white text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center"><div className="w-2 h-2 bg-green-300 rounded-full mr-2"></div>Daily inspection complete</div>
                    <div className="flex items-center"><div className="w-2 h-2 bg-yellow-300 rounded-full mr-2"></div>Material delivery pending</div>
                    <div className="flex items-center"><div className="w-2 h-2 bg-green-300 rounded-full mr-2"></div>Safety check passed</div>
                  </div>
                </div>
              </div>
              <p className="text-slate-600">Streamline field reports with mobile-first documentation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Client Testimonials */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-bold text-[var(--proesphere-deep-blue)] mb-12">Trusted by Industry Leaders</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] rounded-full flex items-center justify-center text-white font-bold">
                    JS
                  </div>
                  <div className="ml-3">
                    <div className="font-semibold">John Smith</div>
                    <div className="text-sm text-slate-500">Project Manager, ACME Builders</div>
                  </div>
                </div>
                <p className="text-slate-600 italic">"Proesphere reduced our project delays by 60%. Game-changer for our scheduling."</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] rounded-full flex items-center justify-center text-white font-bold">
                    MJ
                  </div>
                  <div className="ml-3">
                    <div className="font-semibold">Maria Johnson</div>
                    <div className="text-sm text-slate-500">Site Supervisor, Peak Construction</div>
                  </div>
                </div>
                <p className="text-slate-600 italic">"The mobile app makes field reporting effortless. Our team loves the simplicity."</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] rounded-full flex items-center justify-center text-white font-bold">
                    RW
                  </div>
                  <div className="ml-3">
                    <div className="font-semibold">Robert Wilson</div>
                    <div className="text-sm text-slate-500">Operations Director, Elite Properties</div>
                  </div>
                </div>
                <p className="text-slate-600 italic">"ROI in 3 months. Best investment we've made in project management technology."</p>
              </div>
            </div>
            
            {/* Compliance Badges */}
            <div className="mt-12 flex items-center justify-center space-x-8">
              <div className="bg-white px-4 py-2 rounded-lg shadow border border-slate-200">
                <div className="text-sm font-semibold text-slate-700">SOC-2 Compliant</div>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow border border-slate-200">
                <div className="text-sm font-semibold text-slate-700">99.9% Uptime SLA</div>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow border border-slate-200">
                <div className="text-sm font-semibold text-slate-700">GDPR Ready</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="container mx-auto px-6 py-20" id="pricing">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-[var(--proesphere-deep-blue)] mb-8">
            Simple, Transparent Pricing
          </h3>
          <p className="text-xl text-slate-600 mb-12">
            Starting at $89 per site. Average ROI in 3 months.
          </p>
          <div className="bg-gradient-to-r from-[var(--proesphere-teal)] to-[var(--proesphere-deep-blue)] rounded-2xl p-8 text-white">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">$89</div>
                <div className="text-sm opacity-90">per site/month</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">3 months</div>
                <div className="text-sm opacity-90">average ROI</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">24/7</div>
                <div className="text-sm opacity-90">support included</div>
              </div>
            </div>
            <Button 
              onClick={handleSignIn}
              className="mt-8 bg-white text-[var(--proesphere-deep-blue)] hover:bg-slate-100 font-semibold px-8 py-3 rounded-lg transition-all duration-200"
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-r from-[var(--proesphere-deep-blue)] to-[var(--proesphere-graphite)] py-20" id="resources">
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
      <footer className="bg-[var(--proesphere-graphite)] py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--proesphere-deep-blue)] to-[var(--proesphere-teal)] shadow-lg flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white opacity-30 absolute top-2 left-2"></div>
                    <div className="text-white font-bold text-sm">P</div>
                  </div>
                </div>
                <h1 className="text-xl font-bold text-white mb-4">Proesphere</h1>
              </div>
              <p className="text-slate-300 mb-4">
                360° Project Management for construction excellence. Build smarter, deliver on time.
              </p>
              <div className="text-slate-300 space-y-2 text-sm">
                <div>📧 contact@proesphere.com</div>
                <div>📞 1-800-PROESPHERE</div>
              </div>
            </div>
            
            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <div className="space-y-2 text-slate-300 text-sm">
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Features</a>
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Pricing</a>
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Integrations</a>
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">API</a>
              </div>
            </div>
            
            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <div className="space-y-2 text-slate-300 text-sm">
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">About</a>
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Careers</a>
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Blog</a>
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Press</a>
              </div>
            </div>
            
            {/* Support Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <div className="space-y-2 text-slate-300 text-sm">
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Help Center</a>
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Documentation</a>
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Status</a>
                <a href="#" className="block hover:text-[var(--proesphere-teal)] transition-colors">Contact</a>
              </div>
            </div>
          </div>
          
          {/* Secondary CTA */}
          <div className="text-center mb-8">
            <Button 
              onClick={handleSignIn}
              className="bg-[var(--proesphere-teal)] hover:bg-[var(--proesphere-deep-blue)] text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
            >
              Book a Demo
            </Button>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-slate-600 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm">
              <div className="mb-4 md:mb-0">
                © 2025 Proesphere. All rights reserved.
              </div>
              <div className="flex items-center space-x-6">
                <a href="#" className="hover:text-[var(--proesphere-teal)] transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-[var(--proesphere-teal)] transition-colors">Terms of Service</a>
                <div className="flex items-center space-x-4">
                  <a href="#" className="hover:text-[var(--proesphere-teal)] transition-colors">LinkedIn</a>
                  <a href="#" className="hover:text-[var(--proesphere-teal)] transition-colors">Twitter</a>
                  <a href="#" className="hover:text-[var(--proesphere-teal)] transition-colors">YouTube</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}