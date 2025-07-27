import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Tasks from "@/pages/tasks";
import Schedule from "@/pages/schedule";
import Photos from "@/pages/photos";
import Logs from "@/pages/logs";
import Crew from "@/pages/crew";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileMenu from "@/components/layout/mobile-menu";
import NotificationModal from "@/components/notifications/notification-modal";
import { useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/photos" component={Photos} />
      <Route path="/logs" component={Logs} />
      <Route path="/crew" component={Crew} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex h-screen bg-construction-surface">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            <Header 
              onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
              onToggleNotifications={() => setIsNotificationModalOpen(true)}
            />
            <div className="p-6 overflow-y-auto h-full">
              <Router />
            </div>
          </main>
        </div>
        
        <MobileMenu 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />
        
        <NotificationModal 
          isOpen={isNotificationModalOpen} 
          onClose={() => setIsNotificationModalOpen(false)} 
        />
        
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
