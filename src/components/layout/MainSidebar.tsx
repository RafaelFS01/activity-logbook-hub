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
  useSidebar
} from "@/components/ui/sidebar";
import {
  Activity, // Logo original
  BarChart3,
  Calendar,
  ClipboardList,
  Home,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserCircle,
  Users,
  Palette,
  Contrast // Mantém o ícone necessário para o ciclo de temas
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext"; // Lógica de tema atualizada
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const MainSidebar = () => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme(); // Hook com lógica para 4 temas
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  const activeClass = ({ isActive }: { isActive: boolean }) => {
    return isActive ? "sidebar-active" : "";
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  // Função renderThemeIcon - MANTÉM a lógica atualizada para 4 temas
  const renderThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Moon className="h-5 w-5" />; // Próximo: dark
      case 'dark':
        return <Palette className="h-5 w-5" />; // Próximo: h12
      case 'h12':
        return <Contrast className="h-5 w-5" />; // Próximo: h12-alt
      case 'h12-alt':
        return <Sun className="h-5 w-5" />; // Próximo: light
      default:
        return <Moon className="h-5 w-5" />;
    }
  };

  // Função getThemeButtonTitle - MANTÉM a lógica atualizada para 4 temas
  const getThemeButtonTitle = () => {
    switch (theme) {
      case 'light':
        return 'Ativar modo escuro';
      case 'dark':
        return 'Ativar modo H12';
      case 'h12':
        return 'Ativar modo H12 Alternativo';
      case 'h12-alt':
        return 'Ativar modo claro';
      default:
        return 'Alternar tema';
    }
  };

  return (
      <Sidebar>
        {/* SidebarHeader restaurado para a versão original */}
        <SidebarHeader>
          <div className="flex items-center justify-between px-4">
            {/* Logo e Título Originais */}
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              <span className="font-bold text-lg">Activity Hub</span>
            </div>
            {/* Botão de Tema - Mantém a lógica atualizada */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="ml-2"
                title={getThemeButtonTitle()}
            >
              {renderThemeIcon()}
              <span className="sr-only">Alternar tema</span>
            </Button>
          </div>
        </SidebarHeader>

        {/* O restante do componente permanece como estava no original */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/" className={activeClass} onClick={handleMenuItemClick}>
                      <ClipboardList />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {isManagerOrAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/home" className={activeClass} onClick={handleMenuItemClick}>
                          <Home />
                          <span>Home</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/activities" className={activeClass} onClick={handleMenuItemClick}>
                      <Calendar />
                      <span>Atividades</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/clients" className={activeClass} onClick={handleMenuItemClick}>
                      <Users />
                      <span>Clientes</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/collaborators" className={activeClass} onClick={handleMenuItemClick}>
                      <UserCircle />
                      <span>Colaboradores</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isManagerOrAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Gerenciamento</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/reports" className={activeClass} onClick={handleMenuItemClick}>
                          <BarChart3 />
                          <span>Relatórios</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/settings" className={activeClass} onClick={handleMenuItemClick}>
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
                    onClick={() => {
                      logout();
                      if (isMobile) setOpenMobile(false);
                    }}
                >
                  <LogOut />
                  <span>Sair</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
  );
};

export default MainSidebar;