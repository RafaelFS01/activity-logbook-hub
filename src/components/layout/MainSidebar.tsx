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
  Activity, BarChart3, Calendar, ClipboardList, Home, LogOut, Moon, Settings, Sun, UserCircle, Users, Palette, Contrast
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button"; // Assumindo que Button use as variáveis corretas
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Importe Tooltip
import { useEffect } from "react";

const MainSidebar = () => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  // Função NavLink className - Agora só precisa diferenciar ativo/inativo
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    const baseClasses = "flex items-center w-full gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 ease-in-out group focus:outline-none focus:ring-2 focus:ring-sidebar-ring"; // Base + Focus Ring

    const inactiveClasses = "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:bg-sidebar-accent"; // Estilos Inativo + Hover + Focus BG

    // A classe .sidebar-active definida no CSS cuidará dos estilos ativos
    return `${baseClasses} ${isActive ? 'sidebar-active' : inactiveClasses}`;
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  const renderThemeIcon = () => {
    // ... (lógica original) ...
    // Adiciona classes para tamanho e talvez cor (se não herdar bem)
    const iconClass = "h-5 w-5";
    switch (theme) {
      case 'light': return <Moon className={iconClass} />;
      case 'dark': return <Palette className={iconClass} />;
      case 'h12': return <Contrast className={iconClass} />;
      case 'h12-alt': return <Sun className={iconClass} />;
      default: return <Moon className={iconClass} />;
    }
  };

  const getThemeButtonTitle = () => {
    // ... (lógica original) ...
    return 'Alternar tema'; // Simplificado, o tooltip fará o trabalho
  };

  return (
      // Aplica fundo e texto padrão da sidebar no container principal
      <Sidebar className="bg-sidebar text-sidebar-foreground">
        {/* Header com padding, borda e espaçamento */}
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Logo e Título */}
            <div className="flex items-center gap-2">
              {/* Ícone com cor primária da sidebar para destaque */}
              <Activity className="h-6 w-6 text-sidebar-primary" />
              {/* Título com a cor de texto padrão da sidebar */}
              <span className="font-bold text-lg text-sidebar-foreground">Activity Hub</span>
            </div>

            {/* Botão de Tema com Tooltip */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                      variant="ghost" // Ghost deve usar cores accent para hover no tema atual
                      size="icon"
                      onClick={toggleTheme}
                      className="ml-2" // Mantém margem
                  >
                    {renderThemeIcon()}
                    <span className="sr-only">Alternar tema</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{getThemeButtonTitle()}</p> {/* Conteúdo real do tooltip */}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

          </div>
        </SidebarHeader>

        {/* Conteúdo com padding */}
        <SidebarContent className="p-2 flex-grow"> {/* Adiciona padding geral e flex-grow */}
          <SidebarGroup>
            {/* Label estilizado */}
            <SidebarGroupLabel className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70"> {/* Opacidade para mutar */}
              Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Item Dashboard */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/" className={getNavLinkClass} onClick={handleMenuItemClick}>
                      {/* Ícone com animação sutil no hover do item pai */}
                      <ClipboardList className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Item Home (Condicional) */}
                {isManagerOrAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/home" className={getNavLinkClass} onClick={handleMenuItemClick}>
                          <Home className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                          <span>Home</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                )}

                {/* Outros Itens Principais (Aplicar mesmo padrão) */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/activities" className={getNavLinkClass} onClick={handleMenuItemClick}>
                      <Calendar className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                      <span>Atividades</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/clients" className={getNavLinkClass} onClick={handleMenuItemClick}>
                      <Users className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                      <span>Clientes</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/collaborators" className={getNavLinkClass} onClick={handleMenuItemClick}>
                      <UserCircle className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                      <span>Colaboradores</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Grupo Gerenciamento (Condicional) */}
          {isManagerOrAdmin && (
              <SidebarGroup className="mt-4"> {/* Adiciona margem acima do grupo */}
                <SidebarGroupLabel className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70">
                  Gerenciamento
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* Item Relatórios */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/reports" className={getNavLinkClass} onClick={handleMenuItemClick}>
                          <BarChart3 className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                          <span>Relatórios</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {/* Item Configurações */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/settings" className={getNavLinkClass} onClick={handleMenuItemClick}>
                          <Settings className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                          <span>Configurações</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer com borda superior e padding */}
        <SidebarFooter className="mt-auto border-t border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              {/* Botão Sair estilizado */}
              <SidebarMenuButton asChild>
                <button
                    className="flex items-center w-full gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 ease-in-out text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:bg-destructive/10 group"
                    onClick={() => {
                      logout();
                      if (isMobile) setOpenMobile(false);
                    }}
                >
                  <LogOut className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
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