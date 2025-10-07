import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getActivityById, Activity, updateActivityStatus, deleteActivity } from "@/services/firebase/activities"; // Supondo que ActivityPriority possa vir daqui
import { getClientById, Client } from "@/services/firebase/clients";
import { getUserData, UserData } from "@/services/firebase/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Clock, FileEdit, CircleAlert, CheckCircle, Play, Ban, ClipboardList, AlertTriangle, UserCircle, Trash2, Building2, Tag, Timer, Eye } from "lucide-react";
import { formatDistanceToNow, format, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Tipos (se não importados)
type ActivityStatus = "pending" | "in-progress" | "completed" | "cancelled";
type ActivityPriority = 'low' | 'medium' | 'high'; // Definição do tipo Prioridade

// --- Funções Auxiliares ---
const getStatusLabel = (status: ActivityStatus | string | undefined) => {
  if (!status) return "Desconhecido";
  switch (status) {
    case "pending": return "Futura";
    case "in-progress": return "Em Andamento";
    case "completed": return "Concluída";
    case "cancelled": return "Cancelada";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

// **NOVA FUNÇÃO para traduzir Prioridade**
const getPriorityLabel = (priority: ActivityPriority | string | undefined): string => {
  if (!priority) return "Não definida";
  switch (priority) {
    case "low": return "Baixa";
    case "medium": return "Média";
    case "high": return "Alta";
    default: return priority.charAt(0).toUpperCase() + priority.slice(1);
  }
};

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "Não definida";
  try {
    const parsedDate = parseISO(dateString);
    if (isNaN(parsedDate.getTime())) throw new Error('Invalid date');
    return format(parsedDate, "dd/MM/yyyy");
  } catch (error) {
    console.error("Erro ao formatar data:", dateString, error);
    return "Data inválida";
  }
};

const formatDateTime = (dateTimeString: string | undefined | null): string => {
  if (!dateTimeString) return "Não definida";
  try {
    const parsedDate = parseISO(dateTimeString);
    if (isNaN(parsedDate.getTime())) throw new Error('Invalid date');
    return format(parsedDate, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data e hora:", dateTimeString, error);
    return "Data/hora inválida";
  }
};

const ActivityDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [assignees, setAssignees] = useState<{ [key: string]: UserData | null }>({});
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [assigneesLoading, setAssigneesLoading] = useState(false);

  // --- useEffect, handleStatusChange, handleDeleteActivity (inalterados) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!id) return;

        const activityData = await getActivityById(id);
        setActivity(activityData);

        if (activityData) {
          setClient(await getClientById(activityData.clientId));

          setAssigneesLoading(true);
          const assigneesPromises = activityData.assignedTo.map(async (userId) => {
            try {
              const userData = await getUserData(userId);
              return [userId, userData];
            } catch (error) {
              console.error(`Error fetching user ${userId}:`, error);
              return [userId, null];
            }
          });

          const assigneesResults = await Promise.all(assigneesPromises);
          const assigneesMap = Object.fromEntries(assigneesResults);
          setAssignees(assigneesMap);
          setAssigneesLoading(false);
        }
      } catch (error) {
        console.error("Erro ao buscar dados da atividade:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar atividade",
          description: "Não foi possível obter os dados da atividade."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, toast]); // Adicionado toast como dependência

  const handleStatusChange = async (newStatus: ActivityStatus) => {
    if (!activity || !user) return;

    try {
      setStatusLoading(true);
      await updateActivityStatus(activity.id, newStatus, user.uid);

      setActivity((prevActivity) => prevActivity ? {
        ...prevActivity,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...(newStatus === "completed" ? { completedDate: new Date().toISOString() } : {})
      } : null);

      toast({
        title: "Status atualizado",
        description: `O status da atividade foi alterado para "${getStatusLabel(newStatus)}".`
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status da atividade."
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!activity || !user) return; // Adicionado verificação de user

    try {
      setDeleteLoading(true);
      // A função deleteActivity pode apenas marcar como cancelado ou realmente deletar
      // Se marcar como cancelado, o update de status local abaixo está correto.
      // Se deletar, a navegação já vai ocorrer.
      await deleteActivity(activity.id);

      toast({
        title: "Atividade cancelada/removida",
        description: "A operação foi concluída com sucesso."
      });

      // Atualiza estado local se a operação foi 'cancelar' e não 'deletar'
      // Se foi 'deletar', a navegação cuidará disso.
      // setActivity((prevActivity) => prevActivity ? {
      //     ...prevActivity,
      //     status: "cancelled",
      //     updatedAt: new Date().toISOString()
      // } : null);

      setDeleteLoading(false);

      setTimeout(() => {
        navigate("/activities");
      }, 1500); // Atraso para permitir leitura do toast
    } catch (error) {
      console.error("Erro ao cancelar/remover atividade:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível concluir a operação na atividade."
      });
      setDeleteLoading(false);
    }
  };


  // --- Renderização (Loading, Not Found inalterados) ---
  if (loading) {
    return ( /* Skeleton UI */
        <div className="container mx-auto py-6 px-4 md:px-6">
          <div className="flex items-center mb-6">
            <Skeleton className="h-8 w-8 mr-2" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40 mb-2" />
                  <Skeleton className="h-4 w-60" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            {/* ... resto do skeleton ... */}
          </div>
        </div>
    );
  }

  if (!activity) {
    return ( /* Not Found UI */
        <div className="container mx-auto py-6 px-4 md:px-6">
          <div className="text-center p-10 border rounded-lg bg-muted/10">
            <CircleAlert className="mx-auto h-10 w-10 text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Atividade não encontrada</h3>
            <p className="text-muted-foreground mb-4">
              A atividade que você está procurando não foi encontrada ou foi removida.
            </p>
            <Button onClick={() => navigate("/activities")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Lista de Atividades
            </Button>
          </div>
        </div>
    );
  }

  // --- Renderização Principal ---
  return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        {/* Header com Título e Botões */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/activities")} className="shrink-0">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Eye className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {activity?.title}
                  </h1>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    Detalhes completos da atividade selecionada
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {activity && activity.status !== "completed" && activity.status !== "cancelled" && (
                  <Button variant="outline" onClick={() => navigate(`/activities/edit/${id}`)}>
                    <FileEdit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
              )}
              {user?.role === 'admin' && activity && activity.status !== "cancelled" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancelar/Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar/Remover atividade</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja esta atividade? Esta ação pode não ser reversível.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteActivity}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteLoading}
                        >
                          {deleteLoading ? "Processando..." : "Confirmar"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          {/* === ABA DETALHES (COM PRIORIDADE ATUALIZADA) === */}
          <TabsContent value="details" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Atividade</CardTitle>
                <CardDescription>
                  Detalhes sobre a atividade selecionada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium text-sm flex items-center"><ClipboardList className="h-4 w-4 mr-1 text-muted-foreground"/>Status:</span>
                  <Badge
                      className={
                        activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                            activity.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                activity.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                      }
                  >
                    {getStatusLabel(activity.status)}
                  </Badge>
                </div>

                {/* Tipo */}
                {activity.type && (
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium text-sm flex items-center"><Tag className="h-4 w-4 mr-1 text-muted-foreground"/>Tipo:</span>
                      <span>{activity.type}</span>
                    </div>
                )}

                {/* Cliente */}
                <div className="flex justify-between items-center pb-2 border-b">
                 <span className="font-medium text-sm flex items-center">
                    {client?.type === 'juridica' ? (
                        <Building2 className="h-4 w-4 mr-1 text-muted-foreground" />
                    ) : (
                        <UserCircle className="h-4 w-4 mr-1 text-muted-foreground" />
                    )}
                   Cliente:
                 </span>
                  <span className="text-sm">
                    {client ? (
                        client.type === 'juridica'
                            ? (client as any).companyName || client.name
                            : client.name
                    ) : (
                        <Skeleton className="h-4 w-32 inline-block"/>
                    )}
                 </span>
                </div>

                {/* Prioridade (MODIFICADO) */}
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium text-sm flex items-center"><AlertTriangle className="h-4 w-4 mr-1 text-muted-foreground"/>Prioridade:</span>
                  {/* Use a função getPriorityLabel */}
                  <span className="text-sm">{getPriorityLabel(activity.priority)}</span>
                </div>

                {/* Data e Hora de Início */}
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium text-sm flex items-center"><Calendar className="h-4 w-4 mr-1 text-muted-foreground"/>Início:</span>
                  <span className="text-sm">{formatDateTime(activity.startDate)}</span>
                </div>

                {/* Data e Hora de Término */}
                {activity.endDate && (
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium text-sm flex items-center"><Timer className="h-4 w-4 mr-1 text-muted-foreground"/>Término Previsto:</span>
                      <span className="text-sm">{formatDateTime(activity.endDate)}</span>
                    </div>
                )}

                {/* Data de Conclusão */}
                {activity.completedDate && (
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium text-sm flex items-center"><CheckCircle className="h-4 w-4 mr-1 text-muted-foreground"/>Concluído em:</span>
                      {/* Pode usar formatDateTime se quiser a hora exata da conclusão */}
                      <span className="text-sm">{formatDateTime(activity.completedDate)}</span>
                    </div>
                )}

                {/* Descrição */}
                <div>
                  <h4 className="text-sm font-medium mb-1">Descrição</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                    {activity.description || "Nenhuma descrição fornecida."}
                  </p>
                </div>
              </CardContent>
              {/* CardFooter */}
              {activity.status !== "completed" && activity.status !== "cancelled" && (
                  <CardFooter className="flex justify-end gap-2 pt-4"> {/* Adicionado pt-4 para espaço */}
                    <Button variant="outline" onClick={() => navigate(`/activities/edit/${id}`)}>
                      <FileEdit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </CardFooter>
              )}
            </Card>
          </TabsContent>

          {/* === ABA TIMELINE (inalterada nesta modificação) === */}
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Timeline da Atividade</CardTitle>
                <CardDescription>
                  Histórico de eventos e atualizações da atividade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Criado em: {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Última atualização: {formatDistanceToNow(parseISO(activity.updatedAt), {
                      addSuffix: true,
                      locale: ptBR
                    })} ({formatDateTime(activity.updatedAt)})
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Status atual: {getStatusLabel(activity.status)}
                    </p>
                  </div>
                  {activity.status === "completed" && activity.completedDate && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-muted-foreground">
                          Concluído em: {formatDateTime(activity.completedDate)}
                        </p>
                      </div>
                  )}
                  {activity.status === "cancelled" && (
                      <div className="flex items-center space-x-2">
                        <Ban className="h-4 w-4 text-red-600" />
                        <p className="text-sm text-muted-foreground">
                          Cancelado em: {formatDateTime(activity.updatedAt)}
                        </p>
                      </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default ActivityDetailsPage;