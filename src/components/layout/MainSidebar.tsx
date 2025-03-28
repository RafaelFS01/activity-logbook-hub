
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarRail,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { 
  Activity, 
  ArrowLeft,
  ArrowRight,
  BarChart3, 
  Calendar, 
  ClipboardList, 
  Home, 
  LogOut, 
  Moon,
  PanelLeft,
  Settings, 
  Sun,
  UserCircle, 
  Users 
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

const MainSidebar = () => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { state, toggleSidebar } = useSidebar();
  
  // Função para determinar se um link está ativo
  const activeClass = ({ isActive }: { isActive: boolean }) => {
    return isActive ? "sidebar-active" : "";
  };

  // Verificar se o usuário tem permissão para ver a seção de relatórios
  const canAccessReports = user?.role === "admin" || user?.role === "manager";

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            <span className="font-bold text-lg">Activity Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              className="ml-2"
              title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="sr-only">Alternar tema</span>
            </Button>
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" className={activeClass}>
                    <Home />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/activities" className={activeClass}>
                    <Calendar />
                    <span>Atividades</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/clients" className={activeClass}>
                    <Users />
                    <span>Clientes</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/collaborators" className={activeClass}>
                    <UserCircle />
                    <span>Colaboradores</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {canAccessReports && (
          <SidebarGroup>
            <SidebarGroupLabel>Gerenciamento</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/reports" className={activeClass}>
                      <BarChart3 />
                      <span>Relatórios</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/settings" className={activeClass}>
                      <Settings />
                      <span>Configurações</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button 
                className="w-full flex items-center gap-2"
                onClick={logout}
              >
                <LogOut />
                <span>Sair</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Add SidebarRail for resizing control */}
      <SidebarRail />
      
      {/* Floating button for expanding a collapsed sidebar */}
      {state === "collapsed" && (
        <div className="fixed z-20 left-4 bottom-4 md:left-2 md:bottom-8">
          <Button 
            onClick={toggleSidebar} 
            variant="secondary" 
            size="icon" 
            className="rounded-full shadow-lg"
            title="Expandir barra lateral"
          >
            <ArrowRight className="h-5 w-5" />
            <span className="sr-only">Expandir menu</span>
          </Button>
        </div>
      )}
    </Sidebar>
  );
};

export default MainSidebar;
