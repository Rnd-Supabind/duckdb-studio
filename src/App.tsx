import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { DuckDBProvider } from "@/contexts/DuckDBContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import DataViewPage from "./pages/DataViewPage";
import QueryPage from "./pages/QueryPage";
import TemplatesPage from "./pages/TemplatesPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import AIPage from "./pages/AIPage";
import StorageSettingsPage from "./pages/settings/StorageSettingsPage";
import SecuritySettingsPage from "./pages/settings/SecuritySettingsPage";
import VersioningSettingsPage from "./pages/settings/VersioningSettingsPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DuckDBProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><DataViewPage /></ProtectedRoute>} />
              <Route path="/query" element={<ProtectedRoute><QueryPage /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
              <Route path="/workflows" element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
              <Route path="/ai" element={<ProtectedRoute><AIPage /></ProtectedRoute>} />
              <Route path="/settings/storage" element={<ProtectedRoute><StorageSettingsPage /></ProtectedRoute>} />
              <Route path="/settings/security" element={<ProtectedRoute><SecuritySettingsPage /></ProtectedRoute>} />
              <Route path="/settings/versioning" element={<ProtectedRoute><VersioningSettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </DuckDBProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
