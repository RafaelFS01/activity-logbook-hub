import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Users,
  FileEdit,
  AlertTriangle,
  ChevronRight,
  Eye
} from "lucide-react";
import { Activity, ActivityStatus } from "@/services/firebase/activities";
import { UserData } from "@/services/firebase/auth";
import { Client } from "@/services/firebase/clients";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: Activity;
  clients: Record<string, Client>;
  collaborators: Record<string, UserData & { uid: string }>;
  onStatusChange?: (activityId: string, newStatus: ActivityStatus) => void;
  className?: string;
}

// Funções auxiliares
const getStatusBadge = (status: ActivityStatus) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100">
          <Clock className="h-3 w-3 mr-1" /> Futura
        </Badge>
      );
    case "in-progress":
      return (
        <Badge variant="default" className="border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100">
          <RotateCcw className="h-3 w-3 mr-1" /> Em Progresso
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="border-green-300 bg-green-50 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Concluída
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive" className="border-red-300 bg-red-50 text-red-800 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" /> Cancelada
        </Badge>
      );
    default:
      return <Badge variant="secondary">Desconhecido</Badge>;
  }
};

const getPriorityBadge = (priority: Activity["priority"]) => {
  switch (priority) {
    case "low":
      return <Badge variant="outline" className="text-xs">Baixa</Badge>;
    case "medium":
      return <Badge variant="secondary" className="text-xs">Média</Badge>;
    case "high":
      return <Badge variant="destructive" className="text-xs">Alta</Badge>;
    default:
      return null;
  }
};

const getClientName = (clientId: string | undefined, clients: Record<string, Client>): string => {
  if (!clientId) return "Cliente não especificado";
  const client = clients[clientId];
  if (!client) return `Cliente ${clientId.substring(0, 6)}...`;

  return client.type === 'juridica'
    ? ((client as any).companyName || client.name || 'Empresa sem nome')
    : (client.name || 'Cliente sem nome');
};

const getAssigneeNames = (assigneeIds: string[] | undefined, collaborators: Record<string, UserData & { uid: string }>): string => {
  if (!assigneeIds || assigneeIds.length === 0) return 'Nenhum responsável';

  return assigneeIds
    .map(id => collaborators[id]?.name || `ID ${id.substring(0, 6)}...`)
    .join(', ');
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/D';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch {
    return 'Data inválida';
  }
};

const ActivityCard = ({
  activity,
  clients,
  collaborators,
  onStatusChange,
  className
}: ActivityCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: ActivityStatus) => {
    if (!onStatusChange || !user?.uid) {
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: "Você precisa estar logado para alterar o status."
      });
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(activity.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const canEdit = user?.uid && activity.assignedTo?.includes(user.uid);
  const isCompletedOrCancelled = activity.status === 'completed' || activity.status === 'cancelled';

  return (
    <Card className={cn(
      "overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-200 group",
      className
    )}>
      <CardHeader className="pb-4 bg-gradient-to-br from-card via-card to-card/80 border-b">
        <div className="flex justify-between items-start gap-3">
          {/* Informações principais */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <CardTitle className="text-base sm:text-lg font-semibold leading-tight flex-1 min-w-0">
                <span className="truncate block" title={activity.title || "Atividade sem título"}>
                  {activity.title || "Atividade sem título"}
                </span>
              </CardTitle>
              {getPriorityBadge(activity.priority)}
            </div>

            <CardDescription className="text-sm text-muted-foreground mb-3 leading-relaxed">
              <span className="font-medium text-foreground">
                {getClientName(activity.clientId, clients)}
              </span>
            </CardDescription>

            {/* Tipo da atividade */}
            {activity.type && (
              <Badge variant="outline" className="text-xs px-2 py-1 font-medium">
                {activity.type}
              </Badge>
            )}
          </div>

          {/* Badge de status */}
          <div className="flex-shrink-0 mt-1">
            {getStatusBadge(activity.status)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow space-y-4 py-5 px-5">
        {/* Descrição */}
        {activity.description && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Descrição
            </p>
            <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
              {activity.description}
            </p>
          </div>
        )}

        {/* Informações de tempo */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Prazo
              </p>
              <div className="text-sm text-foreground">
                <div>Início: {formatDate(activity.startDate)}</div>
                {activity.endDate && (
                  <div className="text-muted-foreground">Fim: {formatDate(activity.endDate)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Responsáveis */}
          {activity.assignedTo && activity.assignedTo.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Responsáveis
                </p>
                <p className="text-sm text-foreground">
                  {getAssigneeNames(activity.assignedTo, collaborators)}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Ações */}
      <CardFooter className="flex flex-col gap-3 pt-4 pb-5 px-5 border-t bg-muted/20">
        {/* Botões principais */}
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-sm font-medium"
            onClick={() => navigate(`/activities/${activity.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>

          {canEdit && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-9 text-sm font-medium"
              onClick={() => navigate(`/activities/edit/${activity.id}`)}
            >
              <FileEdit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>

        {/* Ações rápidas de status (apenas se não estiver concluída/cancelada) */}
        {!isCompletedOrCancelled && canEdit && (
          <div className="grid grid-cols-2 gap-2 w-full">
            {/* Botão Cancelar */}
            <Button
              variant="outline"
              size="sm"
                className="h-8 text-xs bg-red-100 text-red-700 font-medium hover:bg-red-200"
              onClick={() => handleStatusChange('cancelled')}
              disabled={isUpdating}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Cancelar
            </Button>

            {/* Botão Iniciar / Concluir */}
            {activity.status === 'pending' ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-blue-100 text-blue-700 font-medium hover:bg-blue-200"
                onClick={() => handleStatusChange('in-progress')}
                disabled={isUpdating}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Iniciar
              </Button>
            ) : activity.status === 'in-progress' ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-green-100 text-green-700 font-medium hover:bg-green-200"
                onClick={() => handleStatusChange('completed')}
                disabled={isUpdating}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Concluir
              </Button>
            ) : null}
          </div>
        )}

        {/* Indicador de ações adicionais */}
        <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Mais ações</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ActivityCard;
