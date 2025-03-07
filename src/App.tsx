
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Layouts
import AppLayout from "@/components/layout/AppLayout";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Index";
import ActivitiesPage from "@/pages/activities/ActivitiesPage";
import NewActivityPage from "@/pages/activities/NewActivityPage";
import EditActivityPage from "@/pages/activities/EditActivityPage";
import ClientsPage from "@/pages/clients/ClientsPage";
import NewClientPage from "@/pages/clients/NewClientPage";
import EditClientPage from "@/pages/clients/EditClientPage";
import CollaboratorsPage from "@/pages/collaborators/CollaboratorsPage";
import NewCollaboratorPage from "@/pages/collaborators/NewCollaboratorPage";
import EditCollaboratorPage from "@/pages/collaborators/EditCollaboratorPage";
import AdminSetup from "@/pages/AdminSetup";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";

// Let's create a QueryClient
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              
              {/* Atividades */}
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="activities/new" element={<NewActivityPage />} />
              <Route path="activities/:id" element={<div>Detalhes da Atividade (A implementar)</div>} />
              <Route path="activities/edit/:id" element={<EditActivityPage />} />
              
              {/* Clientes */}
              <Route path="clients" element={<ClientsPage />} />
              <Route path="clients/new" element={<NewClientPage />} />
              <Route path="clients/:id" element={<div>Detalhes do Cliente (A implementar)</div>} />
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
                  <div>Detalhes do Colaborador (A implementar)</div>
                </ProtectedRoute>
              } />
              <Route path="collaborators/edit/:id" element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <EditCollaboratorPage />
                </ProtectedRoute>
              } />
              
              {/* Reports - to be implemented */}
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <div>Relatórios (A implementar)</div>
                </ProtectedRoute>
              } />
              
              {/* Settings - to be implemented */}
              <Route path="settings" element={
                <div>Configurações (A implementar)</div>
              } />
            </Route>
            
            {/* Rota de fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
