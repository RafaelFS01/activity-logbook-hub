
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Layouts
import AppLayout from "@/components/layout/AppLayout";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Index";
import Home from "@/pages/Home";
import ActivitiesPage from "@/pages/activities/ActivitiesPage";
import ActivityDetailsPage from "@/pages/activities/ActivityDetailsPage";
import NewActivityPage from "@/pages/activities/NewActivityPage";
import EditActivityPage from "@/pages/activities/EditActivityPage";
import ClientsPage from "@/pages/clients/ClientsPage";
import ClientDetailsPage from "@/pages/clients/ClientDetailsPage";
import NewClientPage from "@/pages/clients/NewClientPage";
import EditClientPage from "@/pages/clients/EditClientPage";
import CollaboratorsPage from "@/pages/collaborators/CollaboratorsPage";
import CollaboratorDetailsPage from "@/pages/collaborators/CollaboratorDetailsPage";
import NewCollaboratorPage from "@/pages/collaborators/NewCollaboratorPage";
import EditCollaboratorPage from "@/pages/collaborators/EditCollaboratorPage";
import ReportsPage from "@/pages/reports/ReportsPage";
import Settings from "@/pages/Settings";
import AdminSetup from "@/pages/AdminSetup";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";
import ESocialQuestionsPage from "@/pages/ESocialQuestionsPage.tsx";

// Let's create a QueryClient
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <ActivityProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
              {/* Rota de Login */}
              <Route path="/login" element={<Login />} />
              <Route path="/admin-setup" element={<AdminSetup />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Rotas protegidas */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                
                {/* Home - apenas admin e manager podem acessar */}
                <Route path="home" element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
                    <Home />
                  </ProtectedRoute>
                } />
                
                {/* Atividades */}
                <Route path="activities" element={<ActivitiesPage />} />
                <Route path="activities/new" element={<NewActivityPage />} />
                <Route path="activities/:id" element={<ActivityDetailsPage />} />
                <Route path="activities/edit/:id" element={<EditActivityPage />} />
                
                {/* Dúvidas eSocial */}
                <Route path="duvidas-esocial" element={<ESocialQuestionsPage />} />
                
                {/* Clientes */}
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/new" element={<NewClientPage />} />
                <Route path="clients/:id" element={<ClientDetailsPage />} />
                <Route path="clients/edit/:id" element={<EditClientPage />} />
                
                {/* Colaboradores - apenas admin e manager podem acessar */}
                <Route path="collaborators" element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
                    <CollaboratorsPage />
                  </ProtectedRoute>
                } />
                <Route path="collaborators/new" element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
                    <NewCollaboratorPage />
                  </ProtectedRoute>
                } />
                <Route path="collaborators/:id" element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
                    <CollaboratorDetailsPage />
                  </ProtectedRoute>
                } />
                <Route path="collaborators/edit/:id" element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
                    <EditCollaboratorPage />
                  </ProtectedRoute>
                } />
                
                {/* Reports - apenas admin e manager podem acessar */}
                <Route path="reports" element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
                    <ReportsPage />
                  </ProtectedRoute>
                } />
                
                {/* Settings - apenas admin e manager podem acessar */}
                <Route path="settings" element={
                  <ProtectedRoute allowedRoles={["admin", "manager"]}>
                    <Settings />
                  </ProtectedRoute>
                } />
              </Route>
              
              {/* Rota de fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ActivityProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
