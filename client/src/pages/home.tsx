import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, LogOut, Calendar, CheckCircle, Users } from "lucide-react";
import QuickActions from "@/components/dashboard/quick-actions";
import type { User } from "@shared/schema";

export default function Home() {
  const { user } = useAuth() as { user: User | undefined };
  
  console.log("Home component rendering - Quick Actions should appear here");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect anyway
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-tower-surface dark:bg-tower-surface-dark">
      {/* Header */}
      <header className="bg-white dark:bg-tower-surface-dark shadow-sm border-b border-tower-navy/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-tower-navy to-tower-navy-dark p-2 rounded-xl">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-tower-navy to-tower-navy-light bg-clip-text text-transparent">
                Tower Flow
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user?.profileImageUrl && (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-tower-navy dark:text-white mb-2">
              Dashboard
            </h2>
            <p className="text-tower-navy-light dark:text-gray-300">
              Manage your construction projects with precision and efficiency.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-md bg-white dark:bg-tower-surface-dark">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-tower-navy-light dark:text-gray-400">Active Projects</p>
                    <p className="text-2xl font-bold text-tower-navy dark:text-white">12</p>
                  </div>
                  <div className="bg-tower-emerald/10 p-2 rounded-lg">
                    <Building2 className="h-6 w-6 text-tower-emerald" />
                  </div>
                </div>
              </CardContent>
            </Card>



            <Card className="border-0 shadow-md bg-white dark:bg-tower-surface-dark">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-tower-navy-light dark:text-gray-400">Tasks Due Today</p>
                    <p className="text-2xl font-bold text-tower-navy dark:text-white">7</p>
                  </div>
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <Calendar className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white dark:bg-tower-surface-dark">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-tower-navy-light dark:text-gray-400">Completed Tasks</p>
                    <p className="text-2xl font-bold text-tower-navy dark:text-white">156</p>
                  </div>
                  <div className="bg-tower-emerald/10 p-2 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-tower-emerald" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Actions */}
          <div className="grid md:grid-cols-2 gap-8">
            <QuickActions />

            <Card className="border-0 shadow-lg bg-white dark:bg-tower-surface-dark">
              <CardHeader>
                <CardTitle className="text-tower-navy dark:text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-tower-surface dark:bg-tower-surface-dark rounded-lg">
                    <div className="bg-tower-emerald/10 p-2 rounded-full">
                      <CheckCircle className="h-4 w-4 text-tower-emerald" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-tower-navy dark:text-white">Task Completed</p>
                      <p className="text-xs text-tower-navy-light dark:text-gray-400">Foundation inspection completed</p>
                    </div>
                    <span className="text-xs text-tower-navy-light dark:text-gray-400">2h ago</span>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-tower-surface dark:bg-tower-surface-dark rounded-lg">
                    <div className="bg-tower-navy/10 p-2 rounded-full">
                      <Users className="h-4 w-4 text-tower-navy" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-tower-navy dark:text-white">New Team Member</p>
                      <p className="text-xs text-tower-navy-light dark:text-gray-400">Sarah Johnson joined the team</p>
                    </div>
                    <span className="text-xs text-tower-navy-light dark:text-gray-400">4h ago</span>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-tower-surface dark:bg-tower-surface-dark rounded-lg">
                    <div className="bg-amber-100 p-2 rounded-full">
                      <Calendar className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-tower-navy dark:text-white">Schedule Update</p>
                      <p className="text-xs text-tower-navy-light dark:text-gray-400">Project deadline extended by 2 days</p>
                    </div>
                    <span className="text-xs text-tower-navy-light dark:text-gray-400">1d ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}