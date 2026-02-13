import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import WorkPage from "@/pages/work-page";
import Schedule from "@/pages/schedule";
import Photos from "@/pages/photos";
import Logs from "@/pages/logs";
import ClientPortal from "@/pages/client-portal";
import RBACAdmin from "@/pages/RBACAdmin";
import WaitlistAdmin from "@/pages/waitlist-admin";
import ProjectHealth from "@/pages/project-health";
import MagicLink from "@/pages/magic-link";
import RequestMagicLink from "@/pages/request-magic-link";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import NotificationModal from "@/components/notifications/notification-modal";
import { AgentDrawer } from "@/components/agent";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useState } from "react";

function RedirectToLogin() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/login'); }, [setLocation]);
  return null;
}

function RedirectToDashboard() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/dashboard'); }, [setLocation]);
  return null;
}

function MagicLinkOrRedirect() {
  // If there's a ?token= parameter, always show the magic link verification page
  // (even if the user is already authenticated, e.g. an admin testing a client link).
  // Otherwise, redirect based on the current user's role.
  const search = window.location.search;
  if (search.includes('token=')) {
    return <MagicLink />;
  }

  // No token — redirect authenticated user to the right place
  const [, setLocation] = useLocation();
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/v1/auth/user'],
  });

  useEffect(() => {
    if (!currentUser) return;
    const role = (currentUser?.role || '').toLowerCase();
    if (role === 'client') {
      const projectId = currentUser?.assignedProjectId;
      setLocation(projectId ? `/client-portal?projectId=${projectId}` : '/client-portal');
    } else {
      setLocation('/dashboard');
    }
  }, [currentUser, setLocation]);

  return null;
}

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

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/auth/magic-link" component={MagicLink} />
        <Route path="/auth/request-link" component={RequestMagicLink} />
        <Route component={RedirectToLogin} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/login" component={RedirectToDashboard} />
      <Route path="/auth/magic-link" component={MagicLinkOrRedirect} />
      <Route path="/auth/request-link" component={RedirectToDashboard} />
      <Route path="/work" component={WorkPage} />
      <Route path="/projects" component={WorkPage} />
      <Route path="/tasks" component={WorkPage} />
      <Route path="/project-health" component={ProjectHealth} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/photos" component={Photos} />
      <Route path="/logs" component={Logs} />
      <Route path="/client-portal">
        <ProtectedRoute requiredPermission="clientPortal">
          <ClientPortal />
        </ProtectedRoute>
      </Route>
      {/* Subs module hidden for MVP - will be re-enabled later */}
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
      <Route path="/waitlist-admin">
        <WaitlistAdmin />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAgentChatOpen, setIsAgentChatOpen] = useState(false);
  const [agentConversationId, setAgentConversationId] = useState<string | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppWithAuth
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isNotificationModalOpen={isNotificationModalOpen}
          setIsNotificationModalOpen={setIsNotificationModalOpen}
          isAgentChatOpen={isAgentChatOpen}
          setIsAgentChatOpen={setIsAgentChatOpen}
          agentConversationId={agentConversationId}
          setAgentConversationId={setAgentConversationId}
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
  setIsNotificationModalOpen,
  isAgentChatOpen,
  setIsAgentChatOpen,
  agentConversationId,
  setAgentConversationId
}: {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (open: boolean) => void;
  isAgentChatOpen: boolean;
  setIsAgentChatOpen: (open: boolean) => void;
  agentConversationId: string | null;
  setAgentConversationId: (id: string | null) => void;
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
      isAgentChatOpen={isAgentChatOpen}
      setIsAgentChatOpen={setIsAgentChatOpen}
      agentConversationId={agentConversationId}
      setAgentConversationId={setAgentConversationId}
    />
  );
}

function AuthenticatedLayout({
  isAuthenticated,
  isLoading,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isNotificationModalOpen,
  setIsNotificationModalOpen,
  isAgentChatOpen,
  setIsAgentChatOpen,
  agentConversationId,
  setAgentConversationId
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (open: boolean) => void;
  isAgentChatOpen: boolean;
  setIsAgentChatOpen: (open: boolean) => void;
  agentConversationId: string | null;
  setAgentConversationId: (id: string | null) => void;
}) {
  const [location, setLocation] = useLocation();

  // Fetch current user to check if they're a client
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/v1/auth/user'],
    enabled: isAuthenticated,
  });

  // Check if user is a client
  const isClientUser = currentUser?.role?.toLowerCase() === 'client';
  const assignedProjectId = currentUser?.assignedProjectId;

  // Redirect clients to client portal on login
  useEffect(() => {
    if (isClientUser && !location.startsWith('/client-portal')) {
      // Redirect to client portal with their assigned project
      if (assignedProjectId) {
        setLocation(`/client-portal?projectId=${assignedProjectId}`);
      } else {
        setLocation('/client-portal');
      }
    }
  }, [isClientUser, assignedProjectId, location, setLocation]);

  return (
    <div className="flex h-screen bg-background">
      {/* Hide sidebar for client users */}
      {!isClientUser && (
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
      )}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Hide mobile menu toggle for clients, agent chat not available for clients */}
        <Header
          onToggleMobileMenu={isClientUser ? undefined : () => setIsMobileMenuOpen(true)}
          onToggleNotifications={() => setIsNotificationModalOpen(true)}
          onToggleAgentChat={isClientUser ? undefined : () => setIsAgentChatOpen(true)}
        />
        <div className="flex-1 p-4 md:p-6 overflow-y-auto section-padding" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <Router isAuthenticated={isAuthenticated} isLoading={isLoading} />
        </div>
      </main>

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      {/* Agent chat drawer - not available for client users */}
      {!isClientUser && (
        <AgentDrawer
          open={isAgentChatOpen}
          onOpenChange={setIsAgentChatOpen}
          conversationId={agentConversationId}
          onConversationIdChange={setAgentConversationId}
        />
      )}
    </div>
  );
}

export default App;
