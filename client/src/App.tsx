import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Tasks from "@/pages/tasks";
import Schedule from "@/pages/schedule";
import Photos from "@/pages/photos";
import Logs from "@/pages/logs";
import Crew from "@/pages/crew";
import Subs from "@/pages/subs";
import RBACAdmin from "@/pages/RBACAdmin";
import ProjectHealth from "@/pages/project-health";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileMenu from "@/components/layout/mobile-menu";
import NotificationModal from "@/components/notifications/notification-modal";
import { useState } from "react";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // If still loading auth state, show loading with proper delay to prevent 404 flash
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-text text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/project-health" component={ProjectHealth} />
          <Route path="/schedule" component={Schedule} />
          <Route path="/photos" component={Photos} />
          <Route path="/logs" component={Logs} />
          <Route path="/crew" component={Crew} />
          <Route path="/subs" component={Subs} />
          <Route path="/rbac" component={RBACAdmin} />
          <Route path="/rbac-admin" component={RBACAdmin} />
        </>
      )}
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
        <AuthenticatedLayout
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isNotificationModalOpen={isNotificationModalOpen}
          setIsNotificationModalOpen={setIsNotificationModalOpen}
        />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedLayout({ 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  isNotificationModalOpen, 
  setIsNotificationModalOpen 
}: {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (open: boolean) => void;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
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
      
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <NotificationModal 
        isOpen={isNotificationModalOpen} 
        onClose={() => setIsNotificationModalOpen(false)} 
      />
    </div>
  );
}

export default App;
