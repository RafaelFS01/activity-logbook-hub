import React from 'react';
import { cn } from '@/lib/utils';
import { useActivity, Professional } from '@/contexts/ActivityContext';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityIndicatorProps {
  page: string;
  className?: string;
  showCount?: boolean;
  variant?: 'dot' | 'badge' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
}

export const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({
  page,
  className,
  showCount = true,
  variant = 'badge',
  size = 'sm'
}) => {
  const { getActiveProfessionalsByPage } = useActivity();
  const activeProfessionals = getActiveProfessionalsByPage(page);

  // Não mostrar nada se não há profissionais ativos
  if (activeProfessionals.length === 0) {
    return null;
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2 w-2';
      case 'md':
        return 'h-3 w-3';
      case 'lg':
        return 'h-4 w-4';
      default:
        return 'h-2 w-2';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'dot':
        return (
          <div className="relative">
            <div
              className={cn(
                "rounded-full bg-green-500 animate-pulse",
                getSizeClasses(),
                className
              )}
            />
            {activeProfessionals.length > 1 && (
              <div
                className={cn(
                  "absolute -top-1 -right-1 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold",
                  size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
                )}
              >
                {activeProfessionals.length > 9 ? '9+' : activeProfessionals.length}
              </div>
            )}
          </div>
        );

      case 'pulse':
        return (
          <div className="relative">
            <div
              className={cn(
                "rounded-full bg-green-500 animate-ping absolute",
                getSizeClasses(),
                className
              )}
            />
            <div
              className={cn(
                "rounded-full bg-green-600",
                getSizeClasses(),
                className
              )}
            />
            {showCount && activeProfessionals.length > 1 && (
              <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {activeProfessionals.length > 9 ? '9+' : activeProfessionals.length}
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
                  variant="secondary"
                  className={cn(
                    "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
                    size === 'sm' ? 'text-xs px-1.5 py-0.5' : size === 'md' ? 'text-sm px-2 py-1' : 'text-base px-2.5 py-1.5',
                    className
                  )}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                  {showCount ? activeProfessionals.length : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">Profissionais Ativos nesta página:</p>
                  {activeProfessionals.map((prof) => (
                    <div key={prof.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm">{prof.name}</span>
                      <span className="text-xs text-muted-foreground">({prof.role})</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };

  return getVariantStyles();
};

// Componente específico para sidebar com posicionamento fixo
interface SidebarActivityIndicatorProps {
  page: string;
  className?: string;
}

export const SidebarActivityIndicator: React.FC<SidebarActivityIndicatorProps> = ({
  page,
  className
}) => {
  const { getActiveProfessionalsByPage } = useActivity();
  const activeProfessionals = getActiveProfessionalsByPage(page);

  if (activeProfessionals.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute -top-1 -right-1 z-10",
        className
      )}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              {activeProfessionals.length > 1 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center border border-sidebar-background">
                  <span className="text-white text-xs font-bold">
                    {activeProfessionals.length > 9 ? '9+' : activeProfessionals.length}
                  </span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="space-y-1">
              <p className="font-semibold">Profissionais Ativos:</p>
              {activeProfessionals.map((prof) => (
                <div key={prof.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm">{prof.name}</span>
                  <span className="text-xs text-muted-foreground">({prof.role})</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
