import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { DuckDBProvider } from "@/contexts/DuckDBContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import DataTransformerPage from "./pages/DataTransformerPage";
import TemplatesPage from "./pages/TemplatesPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import FilesPage from './pages/FilesPage';
import TransformedFilesPage from './pages/TransformedFilesPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import { PlansPage } from './pages/admin/PlansPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import SystemSettingsPage from './pages/admin/SystemSettingsPage';
import DeveloperPage from './pages/DeveloperPage';
import StorageSettingsPage from "./pages/settings/StorageSettingsPage";
import SecuritySettingsPage from "./pages/settings/SecuritySettingsPage";
import ExtensionsPage from "./pages/ExtensionsPage";
import VersioningSettingsPage from "./pages/settings/VersioningSettingsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DuckDBProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<AppLayout><DashboardPage /></AppLayout>} />
                  <Route path="/files" element={<AppLayout><FilesPage /></AppLayout>} />
                  <Route path="/transformed" element={<AppLayout><TransformedFilesPage /></AppLayout>} />
                  <Route path="/admin/dashboard" element={<AppLayout><AdminDashboardPage /></AppLayout>} />
                  <Route path="/admin/users" element={<AppLayout><UserManagementPage /></AppLayout>} />
                  <Route path="/admin/plans" element={<AppLayout><PlansPage /></AppLayout>} />
                  <Route path="/admin/audit" element={<AppLayout><AuditLogsPage /></AppLayout>} />
                  <Route path="/admin/system" element={<AppLayout><SystemSettingsPage /></AppLayout>} />
                  <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
                  <Route path="/transform/:filename" element={<AppLayout><DataTransformerPage /></AppLayout>} />
                  <Route path="/templates" element={<AppLayout><TemplatesPage /></AppLayout>} />
                  <Route path="/developer" element={<AppLayout><DeveloperPage /></AppLayout>} />
                  <Route path="/workflows" element={<AppLayout><WorkflowsPage /></AppLayout>} />
                  <Route path="/integrations" element={<AppLayout><IntegrationsPage /></AppLayout>} />
                  <Route path="/settings/storage" element={<AppLayout><StorageSettingsPage /></AppLayout>} />
                  <Route path="/settings/security" element={<AppLayout><SecuritySettingsPage /></AppLayout>} />
                  <Route path="/settings/extensions" element={<AppLayout><ExtensionsPage /></AppLayout>} />
                  <Route path="/settings/versioning" element={<AppLayout><VersioningSettingsPage /></AppLayout>} />
                  <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
                </Route>
              </Routes>
            </BrowserRouter>
          </DuckDBProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
