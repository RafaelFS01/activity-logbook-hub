import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Navigation, ArrowRight } from 'lucide-react';

interface LocationIndicatorProps {
  currentPath: string;
  className?: string;
  variant?: 'badge' | 'icon' | 'dot' | 'arrow';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LocationIndicator: React.FC<LocationIndicatorProps> = ({
  currentPath,
  className,
  variant = 'badge',
  showText = true,
  size = 'sm'
}) => {
  const location = useLocation();
  const isCurrentPage = location.pathname === currentPath;

  // Não mostrar se não é a página atual
  if (!isCurrentPage) {
    return null;
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return variant === 'icon' || variant === 'dot' ? 'h-3 w-3' : 'text-xs px-2 py-0.5';
      case 'md':
        return variant === 'icon' || variant === 'dot' ? 'h-4 w-4' : 'text-sm px-2.5 py-1';
      case 'lg':
        return variant === 'icon' || variant === 'dot' ? 'h-5 w-5' : 'text-base px-3 py-1.5';
      default:
        return variant === 'icon' || variant === 'dot' ? 'h-3 w-3' : 'text-xs px-2 py-0.5';
    }
  };

  const getVariantStyles = () => {
    const baseClasses = "animate-in fade-in slide-in-from-left-2 duration-300";

    switch (variant) {
      case 'icon':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  baseClasses,
                  "flex items-center justify-center rounded-full bg-blue-500 text-white shadow-lg animate-pulse",
                  getSizeClasses(),
                  className
                )}>
                  <MapPin className="h-2 w-2" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você está aqui</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case 'dot':
        return (
          <div className={cn(
            baseClasses,
            "relative",
            className
          )}>
            <div className={cn(
              "rounded-full bg-blue-500 animate-ping absolute",
              getSizeClasses()
            )} />
            <div className={cn(
              "rounded-full bg-blue-600 relative",
              getSizeClasses()
            )} />
          </div>
        );

      case 'arrow':
        return (
          <div className={cn(
            baseClasses,
            "flex items-center gap-1",
            className
          )}>
            <ArrowRight className={cn(
              "text-blue-500",
              size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
            )} />
            {showText && (
              <span className={cn(
                "text-blue-600 font-medium",
                size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
              )}>
                Você está aqui
              </span>
            )}
          </div>
        );

      case 'badge':
      default:
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={cn(
                    baseClasses,
                    "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 font-semibold shadow-md",
                    getSizeClasses(),
                    className
                  )}
                >
                  <Navigation className={cn(
                    "mr-1",
                    size === 'sm' ? 'h-2.5 w-2.5' : size === 'md' ? 'h-3 w-3' : 'h-3.5 w-3.5'
                  )} />
                  {showText ? 'Você está aqui' : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Página atual selecionada</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };

  return getVariantStyles();
};

// Hook para obter o nome da página atual
export const useCurrentPageName = () => {
  const location = useLocation();

  const getPageName = (pathname: string) => {
    const pageNames: Record<string, string> = {
      '/': 'Dashboard',
      '/home': 'Home',
      '/activities': 'Atividades',
      '/clients': 'Clientes',
      '/collaborators': 'Colaboradores',
      '/reports': 'Relatórios',
      '/settings': 'Configurações'
    };

    return pageNames[pathname] || 'Página Desconhecida';
  };

  return {
    currentPath: location.pathname,
    currentPageName: getPageName(location.pathname),
    isCurrentPage: (path: string) => location.pathname === path
  };
};

// Componente simplificado para uso na sidebar
interface SidebarLocationIndicatorProps {
  currentPath: string;
  className?: string;
}

export const SidebarLocationIndicator: React.FC<SidebarLocationIndicatorProps> = ({
  currentPath,
  className
}) => {
  const { isCurrentPage } = useCurrentPageName();

  if (!isCurrentPage(currentPath)) {
    return null;
  }

  // Retorna um indicador visual simples para a sidebar
  return (
    <div
      className={cn(
        "sidebar-location-indicator",
        "absolute right-4 top-4 -translate-y-1/2 translate-x-1",
        "h-3 w-3 rounded-full bg-sidebar-primary shadow-lg",
        "z-50",
        className
      )}
      title="Você está aqui"
    />
  );
};
