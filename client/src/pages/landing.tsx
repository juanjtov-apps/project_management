import { useState, useEffect } from "react";
import { LayoutDashboard, CalendarRange, Users, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import mansionBg from "@assets/stock_images/modern_building_city_055dde4e.jpg";

export default function Landing() {
  const [currentSlide, setCurrentSlide] = useState(0);
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

  const handleSignIn = () => {
    window.location.href = "/login";
  };

  const handleJoinWaitlist = () => {
    setShowWaitlistModal(true);
  };

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

  const cards = [
    {
      icon: LayoutDashboard,
      title: "Real-time Dashboards",
      description: "Live project health, budgets, and team performance at a glance.",
      preview: (
        <div 
          className="rounded-lg overflow-hidden border"
          style={{ 
            backgroundColor: '#0F1115',
            borderColor: 'rgba(74, 222, 128, 0.2)'
          }}
        >
          {/* Header Bar */}
          <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(74, 222, 128, 0.1)' }}>
            <span className="text-xs font-medium" style={{ color: '#4ADE80' }}>Premier Building Solutions</span>
          </div>
          {/* Stats Row */}
          <div className="p-3 grid grid-cols-4 gap-2">
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(74, 222, 128, 0.08)' }}>
              <div className="text-xs text-white/50 mb-1">Active Projects</div>
              <div className="text-xl font-bold" style={{ color: '#4ADE80' }}>13</div>
              <div className="text-xs" style={{ color: '#4ADE80' }}>+2 this week</div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(251, 146, 60, 0.08)' }}>
              <div className="text-xs text-white/50 mb-1">Tasks Due Today</div>
              <div className="text-xl font-bold text-orange-400">4</div>
              <div className="text-xs text-red-400">8 overdue</div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(74, 222, 128, 0.08)' }}>
              <div className="text-xs text-white/50 mb-1">Completed Tasks</div>
              <div className="text-xl font-bold" style={{ color: '#4ADE80' }}>156</div>
              <div className="text-xs" style={{ color: '#4ADE80' }}>+4 this week</div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(74, 222, 128, 0.08)' }}>
              <div className="text-xs text-white/50 mb-1">Financial Health</div>
              <div className="text-xl font-bold" style={{ color: '#4ADE80' }}>$1.2M</div>
              <div className="text-xs" style={{ color: '#4ADE80' }}>On budget</div>
            </div>
          </div>
          {/* Tabs */}
          <div className="px-3 flex gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-t" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#4ADE80' }}>Project Overview</div>
            <div className="px-3 py-1.5 text-white/40">Task Management</div>
            <div className="px-3 py-1.5 text-white/40">Communications</div>
            <div className="px-3 py-1.5 text-white/40">Financial Health</div>
          </div>
          {/* Project Cards with Cover Photos */}
          <div className="p-4 border-t" style={{ borderColor: 'rgba(74, 222, 128, 0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white">Active Projects</span>
              <span className="text-xs text-white/40">View All</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {/* Project Card 1 */}
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(74, 222, 128, 0.2)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <div className="h-20 bg-gradient-to-br from-green-600/30 to-green-800/20 relative">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200')] bg-cover bg-center opacity-40"></div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#4ADE80', color: '#000' }}>65%</div>
                </div>
                <div className="p-2">
                  <div className="text-xs font-medium text-white truncate">Brookfield Estates</div>
                  <div className="text-[10px] text-white/40">12 tasks • 3 due today</div>
                </div>
              </div>
              {/* Project Card 2 */}
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(74, 222, 128, 0.2)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <div className="h-20 bg-gradient-to-br from-blue-600/30 to-blue-800/20 relative">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200')] bg-cover bg-center opacity-40"></div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium bg-orange-400 text-black">35%</div>
                </div>
                <div className="p-2">
                  <div className="text-xs font-medium text-white truncate">Valles de España</div>
                  <div className="text-[10px] text-white/40">8 tasks • 1 at risk</div>
                </div>
              </div>
              {/* Project Card 3 */}
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(74, 222, 128, 0.2)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <div className="h-20 bg-gradient-to-br from-purple-600/30 to-purple-800/20 relative">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200')] bg-cover bg-center opacity-40"></div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#4ADE80', color: '#000' }}>82%</div>
                </div>
                <div className="p-2">
                  <div className="text-xs font-medium text-white truncate">Horizon Tower 27</div>
                  <div className="text-[10px] text-white/40">5 tasks • On track</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: CalendarRange,
      title: "Smart Scheduling",
      description: "Visual Gantt charts with dependencies and critical path tracking.",
      preview: (
        <div 
          className="rounded-lg border overflow-hidden"
          style={{ 
            backgroundColor: '#0F1115',
            borderColor: 'rgba(74, 222, 128, 0.2)'
          }}
        >
          {/* Header with time controls */}
          <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'rgba(74, 222, 128, 0.1)' }}>
            <div className="flex gap-1">
              <span className="px-2 py-1 text-[10px] rounded" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#4ADE80' }}>Weeks</span>
              <span className="px-2 py-1 text-[10px] text-white/40">Months</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/50">
              <span>Zoom</span>
              <div className="w-16 h-1 rounded-full bg-white/20 relative">
                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: '#4ADE80' }}></div>
              </div>
            </div>
          </div>
          
          {/* Date header with Today marker */}
          <div className="px-4 py-2 border-b flex" style={{ borderColor: 'rgba(74, 222, 128, 0.1)' }}>
            <div className="w-32 flex-shrink-0 text-[10px] text-white/50">Task</div>
            <div className="flex-1 grid grid-cols-7 text-[10px] text-white/40 text-center">
              <span>Nov 24</span>
              <span>Nov 25</span>
              <span className="px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(74, 222, 128, 0.2)', color: '#4ADE80' }}>Today</span>
              <span>Nov 27</span>
              <span>Nov 28</span>
              <span>Nov 29</span>
              <span>Nov 30</span>
            </div>
          </div>
          
          {/* Gantt rows */}
          <div className="px-4 py-2">
            {/* Phase 1 - with expand arrow */}
            <div className="flex items-center py-1.5">
              <div className="w-32 flex-shrink-0 flex items-center gap-1 text-[11px] text-white/70">
                <span className="text-white/30">▼</span> Phase 1: Foundation
              </div>
              <div className="flex-1 relative h-5">
                <div className="absolute h-full rounded" style={{ left: '0%', width: '42%', backgroundColor: '#4ADE80' }}>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-black font-medium">75%</span>
                </div>
              </div>
            </div>
            
            {/* Excavation */}
            <div className="flex items-center py-1.5 pl-4">
              <div className="w-28 flex-shrink-0 flex items-center gap-1 text-[10px] text-white/50">
                <span className="text-green-400">✓</span> Excavation
              </div>
              <div className="flex-1 relative h-4">
                <div className="absolute h-full rounded" style={{ left: '0%', width: '28%', backgroundColor: '#4ADE80' }}></div>
              </div>
            </div>
            
            {/* Formwork - in progress */}
            <div className="flex items-center py-1.5 pl-4">
              <div className="w-28 flex-shrink-0 text-[10px] text-white/50">Formwork</div>
              <div className="flex-1 relative h-4">
                <div className="absolute h-full rounded flex items-center overflow-hidden" style={{ left: '20%', width: '35%', backgroundColor: 'rgba(74, 222, 128, 0.3)' }}>
                  <div className="h-full" style={{ width: '80%', backgroundColor: '#4ADE80' }}></div>
                  <span className="absolute right-1 text-[8px] text-white/80">80%</span>
                </div>
              </div>
            </div>
            
            {/* Rebar - in progress with warning */}
            <div className="flex items-center py-1.5 pl-4">
              <div className="w-28 flex-shrink-0 text-[10px] text-white/50">Rebar</div>
              <div className="flex-1 relative h-4">
                <div className="absolute h-full rounded flex items-center overflow-hidden" style={{ left: '35%', width: '28%', backgroundColor: 'rgba(251, 146, 60, 0.3)' }}>
                  <div className="h-full" style={{ width: '40%', backgroundColor: '#fb923c' }}></div>
                  <span className="absolute right-1 text-[8px] text-white/80">40%</span>
                </div>
              </div>
            </div>
            
            {/* Pour Concrete - upcoming */}
            <div className="flex items-center py-1.5 pl-4">
              <div className="w-28 flex-shrink-0 text-[10px] text-white/50">Pour Concrete</div>
              <div className="flex-1 relative h-4">
                <div className="absolute h-full rounded" style={{ left: '57%', width: '25%', backgroundColor: 'rgba(251, 191, 36, 0.5)' }}></div>
              </div>
            </div>
            
            {/* Phase 2 - collapsed */}
            <div className="flex items-center py-1.5 mt-1">
              <div className="w-32 flex-shrink-0 flex items-center gap-1 text-[11px] text-white/50">
                <span className="text-white/30">▶</span> Phase 2: Framing (20%)
              </div>
              <div className="flex-1 relative h-4">
                <div className="absolute h-full rounded" style={{ left: '70%', width: '30%', backgroundColor: 'rgba(74, 222, 128, 0.2)' }}></div>
              </div>
            </div>
          </div>
          
          {/* Footer with legend */}
          <div className="px-4 py-2 border-t flex items-center justify-between" style={{ borderColor: 'rgba(74, 222, 128, 0.1)' }}>
            <div className="flex gap-3 text-[9px] text-white/40">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: '#4ADE80' }}></span> Complete</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-400"></span> At Risk</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400/50"></span> Upcoming</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-white/40">
              Critical Path <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: '#4ADE80' }}></span>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: Users,
      title: "Field Collaboration",
      description: "Real-time messaging and updates for seamless team coordination.",
      preview: (
        <div 
          className="rounded-lg p-4 border"
          style={{ 
            backgroundColor: '#0F1115',
            borderColor: 'rgba(74, 222, 128, 0.2)'
          }}
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: '#4ADE80' }}>MJ</div>
              <div>
                <div className="text-xs text-white/50 mb-1">Mike Johnson • 10:32 AM</div>
                <div className="rounded-lg p-2 text-sm text-white/80" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}>
                  Foundation work complete. Ready for inspection.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 justify-end">
              <div>
                <div className="text-xs text-white/50 mb-1 text-right">Sarah Chen • 10:45 AM</div>
                <div className="rounded-lg p-2 text-sm text-white/80" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  Great! Inspector confirmed for 2pm. Materials are on site.
                </div>
              </div>
              <div className="w-8 h-8 rounded-full flex-shrink-0 bg-blue-500 flex items-center justify-center text-xs font-medium text-white">SC</div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 bg-orange-500 flex items-center justify-center text-xs font-medium text-white">DR</div>
              <div>
                <div className="text-xs text-white/50 mb-1">David Rodriguez • 11:15 AM</div>
                <div className="rounded-lg p-2 text-sm text-white/80" style={{ backgroundColor: 'rgba(251, 146, 60, 0.15)' }}>
                  Framing crew is prepped. We'll start right after inspection.
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % cards.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [cards.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % cards.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section with Background */}
      <div 
        className="relative min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${mansionBg})`,
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        
        {/* Header */}
        <header className="relative z-20">
          <div className="container mx-auto px-6 py-5">
            <nav className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <Logo size="md" variant="full" />
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
                  onClick={handleJoinWaitlist}
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
                  data-testid="button-join-waitlist-header"
                >
                  Join the Waitlist
                </Button>
              </div>
            </nav>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 pt-20 pb-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Build Better.
              <br />
              <span className="text-white">Manage Smarter.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              One intelligent hub connecting tasks, schedule, photos, clients, and payments—built from real GC experience with real-time insights that prevent delays and run projects with clarity.
            </p>
            <Button 
              onClick={handleJoinWaitlist}
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
              data-testid="button-join-waitlist-hero"
            >
              Join the Waitlist
            </Button>
          </div>
        </div>

        {/* Feature Carousel */}
        <div className="relative z-10 container mx-auto px-6 pb-20" id="features">
          <div className="max-w-4xl mx-auto">
            {/* Carousel Container */}
            <div className="relative">
              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: 'rgba(74, 222, 128, 0.2)' }}
                data-testid="button-carousel-prev"
              >
                <ChevronLeft className="w-6 h-6" style={{ color: '#4ADE80' }} />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: 'rgba(74, 222, 128, 0.2)' }}
                data-testid="button-carousel-next"
              >
                <ChevronRight className="w-6 h-6" style={{ color: '#4ADE80' }} />
              </button>

              {/* Cards */}
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {cards.map((card, index) => (
                    <div key={index} className="w-full flex-shrink-0 px-4">
                      <div 
                        className="rounded-2xl p-6 border transition-all duration-300"
                        style={{
                          backgroundColor: 'rgba(15, 23, 31, 0.95)',
                          borderColor: 'rgba(74, 222, 128, 0.3)',
                          boxShadow: '0 0 40px rgba(74, 222, 128, 0.15)'
                        }}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
                          >
                            <card.icon className="h-6 w-6" style={{ color: '#4ADE80' }} />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                            <p className="text-white/60 text-sm">{card.description}</p>
                          </div>
                        </div>
                        {card.preview}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dots */}
              <div className="flex justify-center gap-2 mt-6">
                {cards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      backgroundColor: currentSlide === index ? '#4ADE80' : 'rgba(255, 255, 255, 0.3)'
                    }}
                    data-testid={`button-carousel-dot-${index}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-sm text-white/50">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm text-white/40">
              © 2026 Proesphere. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Waitlist Modal */}
      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent 
          className="sm:max-w-md border-0"
          style={{ 
            backgroundColor: '#0F1115',
            boxShadow: '0 0 60px rgba(74, 222, 128, 0.2)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Join the Waitlist</DialogTitle>
            <DialogDescription className="text-white/60">
              Be the first to know when Proesphere launches. Get early access and exclusive updates.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitWaitlist} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-white/80">First Name *</Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  placeholder="John"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-white/80">Last Name *</Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  placeholder="Smith"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                placeholder="john@company.com"
                data-testid="input-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-white/80">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  placeholder="Acme Construction"
                  data-testid="input-company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white/80">Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  placeholder="Project Manager"
                  data-testid="input-role"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white/80">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                placeholder="+1 (555) 000-0000"
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="text-white/80">How can Proesphere help you?</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                placeholder="Tell us about your construction management needs..."
                rows={3}
                data-testid="input-message"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-semibold py-3 rounded-lg transition-all duration-200"
              style={{
                backgroundColor: '#4ADE80',
                color: '#000'
              }}
              data-testid="button-submit-waitlist"
            >
              {isSubmitting ? "Joining..." : "Join the Waitlist"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
