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
  Activity, BarChart3, Calendar, ClipboardList, Home, LogOut, Moon, Settings, Sun, UserCircle, Users, Palette, Contrast, HelpCircle
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button"; // Assumindo que Button use as variáveis corretas
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Importe Tooltip
import { SidebarActivityIndicator } from "@/components/ui/activity-indicator"; // Importe o indicador de atividade
import { SidebarLocationIndicator, useCurrentPageName } from "@/components/ui/location-indicator"; // Importe o indicador de localização
import { useEffect } from "react";

const MainSidebar = () => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { currentPath } = useCurrentPageName();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  // Função NavLink className - Botões com indicador visual ilustrativo quando ativo
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    const baseClasses = `
      flex items-center w-full gap-3 px-3 py-2 rounded-md text-sm
      transition-all duration-300 ease-out group focus:outline-none focus:ring-2 focus:ring-sidebar-ring
      sidebar-button-hover sidebar-button-transparent relative overflow-hidden
    `; // Base + Focus Ring + Efeitos aprimorados + Indicador visual

    const inactiveClasses = `
      text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground
      hover:shadow-sm hover:-translate-y-0.5 focus:bg-sidebar-accent/40
      before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-transparent
      before:transition-all before:duration-300 before:ease-out
    `; // Estilos Inativo - hover sutil + barra transparente

    const activeClasses = `
      bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/8
      text-sidebar-primary-foreground font-bold shadow-lg
      hover:shadow-2xl hover:-translate-y-1 hover:from-sidebar-primary/30 hover:to-sidebar-primary/15
      border-l-4 border-sidebar-primary
      before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1
      before:bg-sidebar-primary before:shadow-[0_0_15px_rgba(var(--sidebar-primary),0.8)]
      before:transition-all before:duration-300 before:ease-out
      [&>svg]:text-sidebar-primary [&>svg]:drop-shadow-[0_0_8px_rgba(var(--sidebar-primary),1)]
      [&>svg]:scale-110 [&>svg]:transition-transform [&>svg]:duration-300
      ring-2 ring-sidebar-primary/30 ring-offset-2 ring-offset-sidebar-background
    `; // Estilos Ativo - indicador ilustrativo aprimorado com barra colorida, brilho intenso, animação e gradiente

    return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
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

        {/* Conteúdo sem padding */}
        <SidebarContent className="flex-grow"> {/* Remove padding para botões preencherem completamente */}
          <SidebarGroup className="px-0"> {/* Remove padding para botões preencherem completamente */}
            {/* Label estilizado */}
            <SidebarGroupLabel className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70"> {/* Opacidade para mutar */}
              Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Item Dashboard */}
                <SidebarMenuItem className="relative">
                  <SidebarMenuButton asChild>
                    <NavLink to="/" className={getNavLinkClass} onClick={handleMenuItemClick}>
                      {/* Ícone com animação aprimorada no hover do item pai */}
                      <ClipboardList className="h-5 w-5 sidebar-icon-animate" />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {/* Indicador de localização atual - aparece quando usuário está nesta página */}
                  <SidebarLocationIndicator currentPath="/" />
                  {/* Indicador de profissionais ativos - aparece quando há profissionais ativos */}
                  <SidebarActivityIndicator page="/" />
                </SidebarMenuItem>

                {/* Item Home (Condicional) */}
                {isManagerOrAdmin && (
                    <SidebarMenuItem className="relative">
                      <SidebarMenuButton asChild>
                        <NavLink to="/home" className={getNavLinkClass} onClick={handleMenuItemClick}>
                          <Home className="h-5 w-5 sidebar-icon-animate" />
                          <span>Home</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {/* Indicador de localização atual */}
                      <SidebarLocationIndicator currentPath="/home" />
                      {/* Indicador de profissionais ativos */}
                      <SidebarActivityIndicator page="/home" />
                    </SidebarMenuItem>
                )}

                {/* Outros Itens Principais (Aplicar mesmo padrão) */}
                <SidebarMenuItem className="relative">
                  <SidebarMenuButton asChild>
                    <NavLink to="/activities" className={getNavLinkClass} onClick={handleMenuItemClick}>
                      <Calendar className="h-5 w-5 sidebar-icon-animate" />
                      <span>Atividades</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {/* Indicador de localização atual */}
                  <SidebarLocationIndicator currentPath="/activities" />
                  {/* Indicador de profissionais ativos */}
                  <SidebarActivityIndicator page="/activities" />
                </SidebarMenuItem>

                <SidebarMenuItem className="relative">
                  <SidebarMenuButton asChild>
                    <NavLink to="/clients" className={getNavLinkClass} onClick={handleMenuItemClick}>
                      <Users className="h-5 w-5 sidebar-icon-animate" />
                      <span>Clientes</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {/* Indicador de localização atual */}
                  <SidebarLocationIndicator currentPath="/clients" />
                  {/* Indicador de profissionais ativos */}
                  <SidebarActivityIndicator page="/clients" />
                </SidebarMenuItem>
                <SidebarMenuItem className="relative">
                  <SidebarMenuButton asChild>
                    <NavLink to="/collaborators" className={getNavLinkClass} onClick={handleMenuItemClick}>
                      <UserCircle className="h-5 w-5 sidebar-icon-animate" />
                      <span>Colaboradores</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {/* Indicador de localização atual */}
                  <SidebarLocationIndicator currentPath="/collaborators" />
                  {/* Indicador de profissionais ativos */}
                  <SidebarActivityIndicator page="/collaborators" />
                </SidebarMenuItem>
                <SidebarMenuItem className="relative">
                  <SidebarMenuButton asChild>
                    <NavLink to="/duvidas-esocial" className={getNavLinkClass} onClick={handleMenuItemClick}>
                      <HelpCircle className="h-5 w-5 sidebar-icon-animate" />
                      <span>Dúvidas eSocial</span>
                    </NavLink>
                  </SidebarMenuButton>
                  <SidebarLocationIndicator currentPath="/duvidas-esocial" />
                  <SidebarActivityIndicator page="/duvidas-esocial" />
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Grupo Gerenciamento (Condicional) */}
          {isManagerOrAdmin && (
              <SidebarGroup className="mt-4 px-0"> {/* Remove padding e mantém margem acima do grupo */}
                <SidebarGroupLabel className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70">
                  Gerenciamento
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* Item Relatórios */}
                    <SidebarMenuItem className="relative">
                      <SidebarMenuButton asChild>
                        <NavLink to="/reports" className={getNavLinkClass} onClick={handleMenuItemClick}>
                          <BarChart3 className="h-5 w-5 sidebar-icon-animate" />
                          <span>Relatórios</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {/* Indicador de localização atual */}
                      <SidebarLocationIndicator currentPath="/reports" />
                      {/* Indicador de profissionais ativos */}
                      <SidebarActivityIndicator page="/reports" />
                    </SidebarMenuItem>
                    {/* Item Configurações */}
                    <SidebarMenuItem className="relative">
                      <SidebarMenuButton asChild>
                        <NavLink to="/settings" className={getNavLinkClass} onClick={handleMenuItemClick}>
                          <Settings className="h-5 w-5 sidebar-icon-animate" />
                          <span>Configurações</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {/* Indicador de localização atual */}
                      <SidebarLocationIndicator currentPath="/settings" />
                      {/* Indicador de profissionais ativos */}
                      <SidebarActivityIndicator page="/settings" />
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer com borda superior sem padding */}
        <SidebarFooter className="mt-auto border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              {/* Botão Sair estilizado */}
              <SidebarMenuButton asChild>
                <button
                    className="flex items-center w-full gap-3 px-0 py-2 rounded-md text-sm transition-colors duration-150 ease-in-out text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:bg-destructive/10 group"
                    onClick={() => {
                      logout();
                      if (isMobile) setOpenMobile(false);
                    }}
                >
                  <LogOut className="h-5 w-5 sidebar-icon-animate" />
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