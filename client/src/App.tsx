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
import ClientPortal from "@/pages/client-portal";
import Crew from "@/pages/crew";
import Subs from "@/pages/subs";
import RBACAdmin from "@/pages/RBACAdmin";
import ProjectHealth from "@/pages/project-health";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import NotificationModal from "@/components/notifications/notification-modal";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useState } from "react";

function Router({ isAuthenticated, isLoading }: { isAuthenticated: boolean; isLoading: boolean }) {
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
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/project-health" component={ProjectHealth} />
          <Route path="/schedule" component={Schedule} />
          <Route path="/photos" component={Photos} />
          <Route path="/logs" component={Logs} />
          <Route path="/client-portal">
            <ProtectedRoute requiredPermission="clientPortal">
              <ClientPortal />
            </ProtectedRoute>
          </Route>
          <Route path="/crew">
            <ProtectedRoute requiredPermission="crew">
              <Crew />
            </ProtectedRoute>
          </Route>
          <Route path="/subs">
            <ProtectedRoute requiredPermission="subs">
              <Subs />
            </ProtectedRoute>
          </Route>
          <Route path="/rbac">
            <ProtectedRoute requiredPermission="rbacAdmin">
              <RBACAdmin />
            </ProtectedRoute>
          </Route>
          <Route path="/rbac-admin">
            <ProtectedRoute requiredPermission="rbacAdmin">
              <RBACAdmin />
            </ProtectedRoute>
          </Route>
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
        <AppWithAuth
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

function AppWithAuth({ 
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

  // Always render the basic router if loading or not authenticated
  if (isLoading || !isAuthenticated) {
    return <Router isAuthenticated={isAuthenticated} isLoading={isLoading} />;
  }

  return (
    <AuthenticatedLayout
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      isMobileMenuOpen={isMobileMenuOpen}
      setIsMobileMenuOpen={setIsMobileMenuOpen}
      isNotificationModalOpen={isNotificationModalOpen}
      setIsNotificationModalOpen={setIsNotificationModalOpen}
    />
  );
}

function AuthenticatedLayout({ 
  isAuthenticated,
  isLoading,
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  isNotificationModalOpen, 
  setIsNotificationModalOpen 
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          onToggleNotifications={() => setIsNotificationModalOpen(true)}
        />
        <div className="flex-1 p-6 overflow-y-auto section-padding" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <Router isAuthenticated={isAuthenticated} isLoading={isLoading} />
        </div>
      </main>
      
      <NotificationModal 
        isOpen={isNotificationModalOpen} 
        onClose={() => setIsNotificationModalOpen(false)} 
      />
    </div>
  );
}

export default App;
