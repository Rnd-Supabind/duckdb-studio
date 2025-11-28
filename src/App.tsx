import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DuckDBProvider } from "@/contexts/DuckDBContext";
import { AppLayout } from "@/components/layout/AppLayout";
import DataViewPage from "./pages/DataViewPage";
import QueryPage from "./pages/QueryPage";
import TemplatesPage from "./pages/TemplatesPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import AIPage from "./pages/AIPage";
import StorageSettingsPage from "./pages/settings/StorageSettingsPage";
import SecuritySettingsPage from "./pages/settings/SecuritySettingsPage";
import VersioningSettingsPage from "./pages/settings/VersioningSettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DuckDBProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<DataViewPage />} />
              <Route path="/query" element={<QueryPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/workflows" element={<WorkflowsPage />} />
              <Route path="/ai" element={<AIPage />} />
              <Route path="/settings/storage" element={<StorageSettingsPage />} />
              <Route path="/settings/security" element={<SecuritySettingsPage />} />
              <Route path="/settings/versioning" element={<VersioningSettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </DuckDBProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
