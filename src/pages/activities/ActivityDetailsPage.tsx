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
import {
  ArrowLeft, Calendar, Clock, FileEdit, CircleAlert, CheckCircle, Play, Ban, ClipboardList,
  AlertTriangle, UserCircle, Trash2, Building2, Tag, Timer, Eye, Calendar as CalendarIcon,
  Clock as ClockIcon, User, RotateCcw, Activity as ActivityIcon, TrendingUp, Target,
  Users, FileText, CheckCircle2, XCircle, PlusCircle
} from "lucide-react";
import { formatDistanceToNow, format, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Tipos (se não importados)
type ActivityStatus = "pending" | "in-progress" | "completed" | "cancelled";
type ActivityPriority = 'low' | 'medium' | 'high'; // Definição do tipo Prioridade

// --- Funções Auxiliares ---

// Funções auxiliares movidas para dentro do componente
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
  const { theme } = useTheme();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [assignees, setAssignees] = useState<{ [key: string]: UserData | null }>({});
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [assigneesLoading, setAssigneesLoading] = useState(false);

  // --- Funções Auxiliares (dentro do componente para acessar variáveis) ---

  // Função para obter badge de status
  const getStatusBadge = (context: 'client' | 'activity', activityStatus?: ActivityStatus): JSX.Element | null => {
    if (context === 'client') {
      if (!client) return null;
      return client.active ? (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200 whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
          </Badge>
      ) : (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 whitespace-nowrap">
            <XCircle className="h-3 w-3 mr-1" /> Inativo
          </Badge>
      );
    } else if (context === 'activity' && activityStatus) {
      switch(activityStatus) {
        case 'completed': return <Badge className='bg-green-100 text-green-800 border border-green-200 whitespace-nowrap'><CheckCircle2 className="h-3 w-3 mr-1"/>Concluída</Badge>;
        case 'in-progress': return <Badge className='bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap'><RotateCcw className="h-3 w-3 mr-1"/>Em andamento</Badge>;
        case 'cancelled': return <Badge className='bg-red-100 text-red-800 border border-red-200 whitespace-nowrap'><XCircle className="h-3 w-3 mr-1"/>Cancelada</Badge>;
        case 'pending':
        default: return <Badge className='bg-yellow-100 text-yellow-800 border border-yellow-200 whitespace-nowrap'><Clock className="h-3 w-3 mr-1"/>Pendente</Badge>;
      }
    }
    return null;
  };

  // Função para obter nomes dos responsáveis
  const getAssigneeNames = (assigneeIds: string[] | undefined): string => {
    if (!assigneeIds || assigneeIds.length === 0) return 'Nenhum responsável';

    return assigneeIds
        .map(id => assignees[id]?.name || `ID ${id.substring(0, 6)}...`)
        .join(', ');
  };

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => navigate("/activities")} className="mr-3 sm:mr-4 h-9 w-9 shrink-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar para Atividades</span>
          </Button>

              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 sm:p-3 bg-blue-500/10 rounded-lg shrink-0">
                  <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
            {activity?.title}
          </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed truncate">
                    Detalhes completos da atividade selecionada
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
            {activity && activity.status !== "completed" && activity.status !== "cancelled" && (
                <Button variant="outline" onClick={() => navigate(`/activities/edit/${id}`)} className="flex-1 sm:flex-none">
                  <FileEdit className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Editar</span>
                  <span className="sm:hidden">Editar</span>
                </Button>
            )}
            {user?.role === 'admin' && activity && activity.status !== "cancelled" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex-1 sm:flex-none">
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Cancelar/Remover</span>
                      <span className="sm:hidden">Remover</span>
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          <div className="xl:col-span-2">
        <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-auto">
                <TabsTrigger value="details" className="text-sm sm:text-base py-2 sm:py-3">
                  Detalhes da Atividade
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-sm sm:text-base py-2 sm:py-3">
                  Histórico e Timeline
                </TabsTrigger>
          </TabsList>

              {/* === ABA DETALHES === */}
              <TabsContent value="details" className="mt-0">
            <Card>
                  <CardHeader className={`pb-6 ${
                    theme === 'dark' ? 'bg-slate-800/50' :
                    theme === 'h12' ? 'bg-slate-50/50' :
                    theme === 'h12-alt' ? 'bg-slate-800/30' :
                    'bg-slate-50/50'
                  }`}>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl flex-shrink-0 ${
                          theme === 'dark' ? 'bg-indigo-900/40' :
                          theme === 'h12' ? 'bg-indigo-100' :
                          theme === 'h12-alt' ? 'bg-indigo-900/25' :
                          'bg-indigo-100'
                        }`}>
                          <ActivityIcon className={`h-6 w-6 ${
                            theme === 'dark' ? 'text-indigo-300' :
                            theme === 'h12' ? 'text-indigo-600' :
                            theme === 'h12-alt' ? 'text-indigo-400' :
                            'text-indigo-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h1 className={`text-xl sm:text-2xl font-bold mb-2 sm:mb-5 ${
                            theme === 'dark' ? 'text-slate-100' :
                            theme === 'h12' ? 'text-slate-900' :
                            theme === 'h12-alt' ? 'text-slate-200' :
                            'text-slate-900'
                          }`}>
                            {activity.title}
                          </h1>
                          <div className={`space-y-2 ${
                            theme === 'dark' ? 'text-slate-300' :
                            theme === 'h12' ? 'text-slate-600' :
                            theme === 'h12-alt' ? 'text-slate-400' :
                            'text-slate-600'
                          }`}>
                            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-3 sm:mb-5">
                              {activity.description || "Nenhuma descrição fornecida."}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                              {getStatusBadge('activity', activity.status)}
                              {activity.type && (
                                <Badge variant="outline" className={`text-xs ${
                                  theme === 'dark' ? 'border-slate-600' :
                                  theme === 'h12' ? 'border-slate-300' :
                                  theme === 'h12-alt' ? 'border-slate-500' :
                                  'border-slate-300'
                                }`}>
                                  <Tag className="h-3 w-3 mr-1" />
                                  {activity.type}
                  </Badge>
                              )}
                </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {/* Informações Essenciais */}
                    <div className="grid gap-2">
                      {/* Status Section */}
                      <div>
                        <div className={`flex items-center justify-between p-4 rounded-lg border ${
                          theme === 'dark' ? 'bg-slate-800/50 border-slate-700' :
                          theme === 'h12' ? 'bg-slate-50/80 border-slate-200' :
                          theme === 'h12-alt' ? 'bg-slate-800/30 border-slate-600' :
                          'bg-slate-50/80 border-slate-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              theme === 'dark' ? 'bg-blue-900/30' :
                              theme === 'h12' ? 'bg-blue-100' :
                              theme === 'h12-alt' ? 'bg-blue-900/20' :
                              'bg-blue-100'
                            }`}>
                              <ClipboardList className={`h-5 w-5 ${
                                theme === 'dark' ? 'text-blue-300' :
                                theme === 'h12' ? 'text-blue-600' :
                                theme === 'h12-alt' ? 'text-blue-400' :
                                'text-blue-600'
                              }`} />
                    </div>
                            <div>
                              <p className={`text-sm font-medium ${
                                theme === 'dark' ? 'text-slate-200' :
                                theme === 'h12' ? 'text-slate-800' :
                                theme === 'h12-alt' ? 'text-slate-300' :
                                'text-slate-800'
                              }`}>Status da Atividade</p>
                              <p className={`text-sm ${
                                theme === 'dark' ? 'text-slate-400' :
                                theme === 'h12' ? 'text-slate-600' :
                                theme === 'h12-alt' ? 'text-slate-400' :
                                'text-slate-600'
                              }`}>Estado atual da atividade</p>
                            </div>
                          </div>
                          {getStatusBadge('activity', activity.status)}
                        </div>
                      </div>

                      <Separator className="my-6" />

                      {/* Client Information */}
                      {client && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              theme === 'dark' ? 'bg-green-900/30' :
                              theme === 'h12' ? 'bg-green-100' :
                              theme === 'h12-alt' ? 'bg-green-900/20' :
                              'bg-green-100'
                            }`}>
                              {client.type === 'juridica' ? (
                                <Building2 className={`h-4 w-4 ${
                                  theme === 'dark' ? 'text-green-300' :
                                  theme === 'h12' ? 'text-green-600' :
                                  theme === 'h12-alt' ? 'text-green-400' :
                                  'text-green-600'
                                }`} />
                              ) : (
                                <User className={`h-4 w-4 ${
                                  theme === 'dark' ? 'text-green-300' :
                                  theme === 'h12' ? 'text-green-600' :
                                  theme === 'h12-alt' ? 'text-green-400' :
                                  'text-green-600'
                                }`} />
                              )}
                            </div>
                            Cliente Associado
                          </h3>

                          <div className={`p-4 rounded-lg ${
                            theme === 'dark' ? 'bg-green-950/30' :
                            theme === 'h12' ? 'bg-muted/20' :
                            theme === 'h12-alt' ? 'bg-green-950/20' :
                            'bg-muted/20'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                theme === 'dark' ? 'bg-green-900/40' :
                                theme === 'h12' ? 'bg-green-100' :
                                theme === 'h12-alt' ? 'bg-green-900/25' :
                                'bg-green-100'
                              }`}>
                                {client.type === 'juridica' ? (
                                  <Building2 className={`h-4 w-4 ${
                                    theme === 'dark' ? 'text-green-400' :
                                    theme === 'h12' ? 'text-green-600' :
                                    theme === 'h12-alt' ? 'text-green-500' :
                                    'text-green-600'
                                  }`} />
                                ) : (
                                  <User className={`h-4 w-4 ${
                                    theme === 'dark' ? 'text-green-400' :
                                    theme === 'h12' ? 'text-green-600' :
                                    theme === 'h12-alt' ? 'text-green-500' :
                                    'text-green-600'
                                  }`} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium uppercase tracking-wide ${
                                  theme === 'dark' ? 'text-green-300' :
                                  theme === 'h12' ? 'text-muted-foreground' :
                                  theme === 'h12-alt' ? 'text-green-300' :
                                  'text-muted-foreground'
                                }`}>
                                  {client.type === 'juridica' ? 'Empresa' : 'Cliente'}
                                </p>
                                <p className={`text-sm font-medium ${
                                  theme === 'dark' ? 'text-green-100' :
                                  theme === 'h12' ? 'text-foreground' :
                                  theme === 'h12-alt' ? 'text-green-100' :
                                  'text-foreground'
                                }`}>
                                  {client.type === 'juridica'
                            ? (client as any).companyName || client.name
                                    : client.name}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <Separator className="my-6" />

                      {/* Priority and Dates */}
                      <div className="grid gap-6">
                        {/* Priority Section */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              theme === 'dark' ? 'bg-orange-900/30' :
                              theme === 'h12' ? 'bg-orange-100' :
                              theme === 'h12-alt' ? 'bg-orange-900/20' :
                              'bg-orange-100'
                            }`}>
                              <Target className={`h-4 w-4 ${
                                theme === 'dark' ? 'text-orange-300' :
                                theme === 'h12' ? 'text-orange-600' :
                                theme === 'h12-alt' ? 'text-orange-400' :
                                'text-orange-600'
                              }`} />
                </div>
                            Prioridade e Prazos
                          </h3>

                          <div className="grid gap-4">
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${
                              theme === 'dark' ? 'bg-orange-950/30' :
                              theme === 'h12' ? 'bg-muted/20' :
                              theme === 'h12-alt' ? 'bg-orange-950/20' :
                              'bg-muted/20'
                            }`}>
                              <Target className={`h-4 w-4 flex-shrink-0 ${
                                theme === 'dark' ? 'text-orange-400' :
                                theme === 'h12' ? 'text-muted-foreground' :
                                theme === 'h12-alt' ? 'text-orange-400' :
                                'text-muted-foreground'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium uppercase tracking-wide ${
                                  theme === 'dark' ? 'text-orange-300' :
                                  theme === 'h12' ? 'text-muted-foreground' :
                                  theme === 'h12-alt' ? 'text-orange-300' :
                                  'text-muted-foreground'
                                }`}>Nível de Prioridade</p>
                                <p className={`text-sm font-medium ${
                                  theme === 'dark' ? 'text-orange-100' :
                                  theme === 'h12' ? 'text-foreground' :
                                  theme === 'h12-alt' ? 'text-orange-100' :
                                  'text-foreground'
                                }`}>
                                  {getPriorityLabel(activity.priority)}
                                  {activity.priority === 'high' && <span className="ml-2 text-red-500">🔥</span>}
                                  {activity.priority === 'medium' && <span className="ml-2 text-yellow-500">⚡</span>}
                                  {activity.priority === 'low' && <span className="ml-2 text-green-500">🟢</span>}
                                </p>
                              </div>
                </div>

                            <div className={`flex items-center gap-3 p-3 rounded-lg ${
                              theme === 'dark' ? 'bg-blue-950/30' :
                              theme === 'h12' ? 'bg-muted/20' :
                              theme === 'h12-alt' ? 'bg-blue-950/20' :
                              'bg-muted/20'
                            }`}>
                              <CalendarIcon className={`h-4 w-4 flex-shrink-0 ${
                                theme === 'dark' ? 'text-blue-400' :
                                theme === 'h12' ? 'text-muted-foreground' :
                                theme === 'h12-alt' ? 'text-blue-400' :
                                'text-muted-foreground'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium uppercase tracking-wide ${
                                  theme === 'dark' ? 'text-blue-300' :
                                  theme === 'h12' ? 'text-muted-foreground' :
                                  theme === 'h12-alt' ? 'text-blue-300' :
                                  'text-muted-foreground'
                                }`}>Data de Início</p>
                                <p className={`text-sm ${
                                  theme === 'dark' ? 'text-blue-100' :
                                  theme === 'h12' ? 'text-foreground' :
                                  theme === 'h12-alt' ? 'text-blue-100' :
                                  'text-foreground'
                                }`}>{formatDate(activity.startDate)}</p>
                              </div>
                </div>

                {activity.endDate && (
                              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                                theme === 'dark' ? 'bg-purple-950/30' :
                                theme === 'h12' ? 'bg-muted/20' :
                                theme === 'h12-alt' ? 'bg-purple-950/20' :
                                'bg-muted/20'
                              }`}>
                                <Timer className={`h-4 w-4 flex-shrink-0 ${
                                  theme === 'dark' ? 'text-purple-400' :
                                  theme === 'h12' ? 'text-muted-foreground' :
                                  theme === 'h12-alt' ? 'text-purple-400' :
                                  'text-muted-foreground'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium uppercase tracking-wide ${
                                    theme === 'dark' ? 'text-purple-300' :
                                    theme === 'h12' ? 'text-muted-foreground' :
                                    theme === 'h12-alt' ? 'text-purple-300' :
                                    'text-muted-foreground'
                                  }`}>Prazo Final</p>
                                  <p className={`text-sm ${
                                    theme === 'dark' ? 'text-purple-100' :
                                    theme === 'h12' ? 'text-foreground' :
                                    theme === 'h12-alt' ? 'text-purple-100' :
                                    'text-foreground'
                                  }`}>{formatDate(activity.endDate)}</p>
                                </div>
                    </div>
                )}

                {activity.completedDate && (
                              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                                theme === 'dark' ? 'bg-green-950/30' :
                                theme === 'h12' ? 'bg-muted/20' :
                                theme === 'h12-alt' ? 'bg-green-950/20' :
                                'bg-muted/20'
                              }`}>
                                <CheckCircle className={`h-4 w-4 flex-shrink-0 ${
                                  theme === 'dark' ? 'text-green-400' :
                                  theme === 'h12' ? 'text-muted-foreground' :
                                  theme === 'h12-alt' ? 'text-green-400' :
                                  'text-muted-foreground'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium uppercase tracking-wide ${
                                    theme === 'dark' ? 'text-green-300' :
                                    theme === 'h12' ? 'text-muted-foreground' :
                                    theme === 'h12-alt' ? 'text-green-300' :
                                    'text-muted-foreground'
                                  }`}>Concluída em</p>
                                  <p className={`text-sm ${
                                    theme === 'dark' ? 'text-green-100' :
                                    theme === 'h12' ? 'text-foreground' :
                                    theme === 'h12-alt' ? 'text-green-100' :
                                    'text-foreground'
                                  }`}>{formatDateTime(activity.completedDate)}</p>
                                </div>
                    </div>
                )}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-6" />

                      {/* Assignees Section */}
                      {activity.assignedTo && activity.assignedTo.length > 0 && (
                <div>
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${
                              theme === 'dark' ? 'bg-cyan-900/30' :
                              theme === 'h12' ? 'bg-cyan-100' :
                              theme === 'h12-alt' ? 'bg-cyan-900/20' :
                              'bg-cyan-100'
                            }`}>
                              <Users className={`h-4 w-4 ${
                                theme === 'dark' ? 'text-cyan-300' :
                                theme === 'h12' ? 'text-cyan-600' :
                                theme === 'h12-alt' ? 'text-cyan-400' :
                                'text-cyan-600'
                              }`} />
                            </div>
                            Responsáveis pela Atividade
                          </h3>

                          <div className={`p-4 rounded-lg ${
                            theme === 'dark' ? 'bg-cyan-950/30' :
                            theme === 'h12' ? 'bg-muted/20' :
                            theme === 'h12-alt' ? 'bg-cyan-950/20' :
                            'bg-muted/20'
                          }`}>
                            <div className="flex items-center gap-3">
                              <Users className={`h-4 w-4 flex-shrink-0 ${
                                theme === 'dark' ? 'text-cyan-400' :
                                theme === 'h12' ? 'text-muted-foreground' :
                                theme === 'h12-alt' ? 'text-cyan-400' :
                                'text-muted-foreground'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium uppercase tracking-wide ${
                                  theme === 'dark' ? 'text-cyan-300' :
                                  theme === 'h12' ? 'text-muted-foreground' :
                                  theme === 'h12-alt' ? 'text-cyan-300' :
                                  'text-muted-foreground'
                                }`}>Equipe Responsável</p>
                                <p className={`text-sm ${
                                  theme === 'dark' ? 'text-cyan-100' :
                                  theme === 'h12' ? 'text-foreground' :
                                  theme === 'h12-alt' ? 'text-cyan-100' :
                                  'text-foreground'
                                }`}>
                                  {getAssigneeNames(activity.assignedTo)}
                  </p>
                </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
              {activity.status !== "completed" && activity.status !== "cancelled" && (
                      <>
                        <Separator className="my-6" />
                        <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => navigate(`/activities/edit/${id}`)}>
                      <FileEdit className="h-4 w-4 mr-2" />
                            Editar Atividade
                    </Button>
                        </div>
                      </>
              )}
                  </CardContent>
            </Card>
          </TabsContent>

              {/* === ABA TIMELINE === */}
              <TabsContent value="timeline" className="mt-0">
            <Card>
                  <CardHeader className={`pb-6 ${
                    theme === 'dark' ? 'bg-slate-800/50' :
                    theme === 'h12' ? 'bg-slate-50/50' :
                    theme === 'h12-alt' ? 'bg-slate-800/30' :
                    'bg-slate-50/50'
                  }`}>
                <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl flex-shrink-0 ${
                          theme === 'dark' ? 'bg-purple-900/40' :
                          theme === 'h12' ? 'bg-purple-100' :
                          theme === 'h12-alt' ? 'bg-purple-900/25' :
                          'bg-purple-100'
                        }`}>
                          <ClockIcon className={`h-6 w-6 ${
                            theme === 'dark' ? 'text-purple-300' :
                            theme === 'h12' ? 'text-purple-600' :
                            theme === 'h12-alt' ? 'text-purple-400' :
                            'text-purple-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h1 className={`text-2xl font-bold mb-2 ${
                            theme === 'dark' ? 'text-slate-100' :
                            theme === 'h12' ? 'text-slate-900' :
                            theme === 'h12-alt' ? 'text-slate-200' :
                            'text-slate-900'
                          }`}>
                            Histórico e Timeline
                          </h1>
                          <div className={`space-y-2 ${
                            theme === 'dark' ? 'text-slate-300' :
                            theme === 'h12' ? 'text-slate-600' :
                            theme === 'h12-alt' ? 'text-slate-400' :
                            'text-slate-600'
                          }`}>
                            <p className="text-base leading-relaxed">
                              Acompanhe toda a evolução e histórico de eventos desta atividade
                            </p>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                              theme === 'dark' ? 'bg-slate-700 text-slate-200' :
                              theme === 'h12' ? 'bg-slate-200 text-slate-800' :
                              theme === 'h12-alt' ? 'bg-slate-700 text-slate-300' :
                              'bg-slate-200 text-slate-800'
                            }`}>
                              <ClockIcon className={`h-4 w-4 ${
                                theme === 'dark' ? 'text-slate-400' :
                                theme === 'h12' ? 'text-slate-600' :
                                theme === 'h12-alt' ? 'text-slate-500' :
                                'text-slate-600'
                              }`} />
                              Timeline Completo
                  </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Timeline Events */}
                      <div className="relative">
                        {/* Timeline Line */}
                        <div className={`absolute left-6 top-0 bottom-0 w-0.5 ${
                          theme === 'dark' ? 'bg-slate-700' :
                          theme === 'h12' ? 'bg-slate-300' :
                          theme === 'h12-alt' ? 'bg-slate-600' :
                          'bg-slate-300'
                        }`} />

                        {/* Timeline Items */}
                        <div className="space-y-6">
                          {/* Created Event */}
                          <div className="relative flex items-start gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                              theme === 'dark' ? 'bg-slate-800 border-slate-600' :
                              theme === 'h12' ? 'bg-white border-slate-300' :
                              theme === 'h12-alt' ? 'bg-slate-800 border-slate-600' :
                              'bg-white border-slate-300'
                            }`}>
                              <PlusCircle className={`h-6 w-6 ${
                                theme === 'dark' ? 'text-green-400' :
                                theme === 'h12' ? 'text-green-600' :
                                theme === 'h12-alt' ? 'text-green-500' :
                                'text-green-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0 pb-6">
                              <div className={`p-4 rounded-lg ${
                                theme === 'dark' ? 'bg-slate-800/50' :
                                theme === 'h12' ? 'bg-muted/20' :
                                theme === 'h12-alt' ? 'bg-slate-800/30' :
                                'bg-muted/20'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className={`font-semibold ${
                                    theme === 'dark' ? 'text-slate-100' :
                                    theme === 'h12' ? 'text-slate-900' :
                                    theme === 'h12-alt' ? 'text-slate-200' :
                                    'text-slate-900'
                                  }`}>Atividade Criada</h4>
                                  <span className={`text-sm ${
                                    theme === 'dark' ? 'text-slate-400' :
                                    theme === 'h12' ? 'text-slate-500' :
                                    theme === 'h12-alt' ? 'text-slate-400' :
                                    'text-slate-500'
                                  }`}>
                                    {formatDistanceToNow(parseISO(activity.createdAt), {
                      addSuffix: true,
                      locale: ptBR
                                    })}
                                  </span>
                                </div>
                                <p className={`text-sm ${
                                  theme === 'dark' ? 'text-slate-300' :
                                  theme === 'h12' ? 'text-slate-600' :
                                  theme === 'h12-alt' ? 'text-slate-400' :
                                  'text-slate-600'
                                }`}>
                                  A atividade foi criada no sistema
                                </p>
                                <p className={`text-xs mt-1 ${
                                  theme === 'dark' ? 'text-slate-500' :
                                  theme === 'h12' ? 'text-slate-400' :
                                  theme === 'h12-alt' ? 'text-slate-500' :
                                  'text-slate-400'
                                }`}>
                                  {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                            </div>
                          </div>

                          {/* Status Changes */}
                          <div className="relative flex items-start gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                              theme === 'dark' ? 'bg-slate-800 border-slate-600' :
                              theme === 'h12' ? 'bg-white border-slate-300' :
                              theme === 'h12-alt' ? 'bg-slate-800 border-slate-600' :
                              'bg-white border-slate-300'
                            }`}>
                              {activity.status === 'completed' ? (
                                <CheckCircle2 className={`h-6 w-6 ${
                                  theme === 'dark' ? 'text-green-400' :
                                  theme === 'h12' ? 'text-green-600' :
                                  theme === 'h12-alt' ? 'text-green-500' :
                                  'text-green-600'
                                }`} />
                              ) : activity.status === 'in-progress' ? (
                                <RotateCcw className={`h-6 w-6 ${
                                  theme === 'dark' ? 'text-blue-400' :
                                  theme === 'h12' ? 'text-blue-600' :
                                  theme === 'h12-alt' ? 'text-blue-500' :
                                  'text-blue-600'
                                }`} />
                              ) : activity.status === 'cancelled' ? (
                                <XCircle className={`h-6 w-6 ${
                                  theme === 'dark' ? 'text-red-400' :
                                  theme === 'h12' ? 'text-red-600' :
                                  theme === 'h12-alt' ? 'text-red-500' :
                                  'text-red-600'
                                }`} />
                              ) : (
                                <ClockIcon className={`h-6 w-6 ${
                                  theme === 'dark' ? 'text-yellow-400' :
                                  theme === 'h12' ? 'text-yellow-600' :
                                  theme === 'h12-alt' ? 'text-yellow-500' :
                                  'text-yellow-600'
                                }`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-6">
                              <div className={`p-4 rounded-lg ${
                                theme === 'dark' ? 'bg-slate-800/50' :
                                theme === 'h12' ? 'bg-muted/20' :
                                theme === 'h12-alt' ? 'bg-slate-800/30' :
                                'bg-muted/20'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className={`font-semibold ${
                                    theme === 'dark' ? 'text-slate-100' :
                                    theme === 'h12' ? 'text-slate-900' :
                                    theme === 'h12-alt' ? 'text-slate-200' :
                                    'text-slate-900'
                                  }`}>
                                    Status: {getStatusLabel(activity.status)}
                                  </h4>
                                  <span className={`text-sm ${
                                    theme === 'dark' ? 'text-slate-400' :
                                    theme === 'h12' ? 'text-slate-500' :
                                    theme === 'h12-alt' ? 'text-slate-400' :
                                    'text-slate-500'
                                  }`}>
                                    {formatDistanceToNow(parseISO(activity.updatedAt), {
                                      addSuffix: true,
                                      locale: ptBR
                                    })}
                                  </span>
                                </div>
                                <p className={`text-sm ${
                                  theme === 'dark' ? 'text-slate-300' :
                                  theme === 'h12' ? 'text-slate-600' :
                                  theme === 'h12-alt' ? 'text-slate-400' :
                                  'text-slate-600'
                                }`}>
                                  O status da atividade foi alterado para <strong>{getStatusLabel(activity.status)}</strong>
                                </p>
                                <p className={`text-xs mt-1 ${
                                  theme === 'dark' ? 'text-slate-500' :
                                  theme === 'h12' ? 'text-slate-400' :
                                  theme === 'h12-alt' ? 'text-slate-500' :
                                  'text-slate-400'
                                }`}>
                                  {formatDateTime(activity.updatedAt)}
                    </p>
                  </div>
                            </div>
                          </div>

                          {/* Completion Event */}
                  {activity.status === "completed" && activity.completedDate && (
                            <div className="relative flex items-start gap-4">
                              <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                                theme === 'dark' ? 'bg-slate-800 border-slate-600' :
                                theme === 'h12' ? 'bg-white border-slate-300' :
                                theme === 'h12-alt' ? 'bg-slate-800 border-slate-600' :
                                'bg-white border-slate-300'
                              }`}>
                                <CheckCircle2 className={`h-6 w-6 ${
                                  theme === 'dark' ? 'text-green-400' :
                                  theme === 'h12' ? 'text-green-600' :
                                  theme === 'h12-alt' ? 'text-green-500' :
                                  'text-green-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`p-4 rounded-lg ${
                                  theme === 'dark' ? 'bg-slate-800/50' :
                                  theme === 'h12' ? 'bg-muted/20' :
                                  theme === 'h12-alt' ? 'bg-slate-800/30' :
                                  'bg-muted/20'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className={`font-semibold ${
                                      theme === 'dark' ? 'text-slate-100' :
                                      theme === 'h12' ? 'text-slate-900' :
                                      theme === 'h12-alt' ? 'text-slate-200' :
                                      'text-slate-900'
                                    }`}>Atividade Concluída</h4>
                                    <span className={`text-sm ${
                                      theme === 'dark' ? 'text-slate-400' :
                                      theme === 'h12' ? 'text-slate-500' :
                                      theme === 'h12-alt' ? 'text-slate-400' :
                                      'text-slate-500'
                                    }`}>
                                      {formatDistanceToNow(parseISO(activity.completedDate), {
                                        addSuffix: true,
                                        locale: ptBR
                                      })}
                                    </span>
                                  </div>
                                  <p className={`text-sm ${
                                    theme === 'dark' ? 'text-slate-300' :
                                    theme === 'h12' ? 'text-slate-600' :
                                    theme === 'h12-alt' ? 'text-slate-400' :
                                    'text-slate-600'
                                  }`}>
                                    A atividade foi marcada como concluída com sucesso
                                  </p>
                                  <p className={`text-xs mt-1 ${
                                    theme === 'dark' ? 'text-slate-500' :
                                    theme === 'h12' ? 'text-slate-400' :
                                    theme === 'h12-alt' ? 'text-slate-500' :
                                    'text-slate-400'
                                  }`}>
                                    {formatDateTime(activity.completedDate)}
                                  </p>
                                </div>
                              </div>
                      </div>
                  )}

                          {/* Cancellation Event */}
                  {activity.status === "cancelled" && (
                            <div className="relative flex items-start gap-4">
                              <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                                theme === 'dark' ? 'bg-slate-800 border-slate-600' :
                                theme === 'h12' ? 'bg-white border-slate-300' :
                                theme === 'h12-alt' ? 'bg-slate-800 border-slate-600' :
                                'bg-white border-slate-300'
                              }`}>
                                <XCircle className={`h-6 w-6 ${
                                  theme === 'dark' ? 'text-red-400' :
                                  theme === 'h12' ? 'text-red-600' :
                                  theme === 'h12-alt' ? 'text-red-500' :
                                  'text-red-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`p-4 rounded-lg ${
                                  theme === 'dark' ? 'bg-slate-800/50' :
                                  theme === 'h12' ? 'bg-muted/20' :
                                  theme === 'h12-alt' ? 'bg-slate-800/30' :
                                  'bg-muted/20'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className={`font-semibold ${
                                      theme === 'dark' ? 'text-slate-100' :
                                      theme === 'h12' ? 'text-slate-900' :
                                      theme === 'h12-alt' ? 'text-slate-200' :
                                      'text-slate-900'
                                    }`}>Atividade Cancelada</h4>
                                    <span className={`text-sm ${
                                      theme === 'dark' ? 'text-slate-400' :
                                      theme === 'h12' ? 'text-slate-500' :
                                      theme === 'h12-alt' ? 'text-slate-400' :
                                      'text-slate-500'
                                    }`}>
                                      {formatDistanceToNow(parseISO(activity.updatedAt), {
                                        addSuffix: true,
                                        locale: ptBR
                                      })}
                                    </span>
                                  </div>
                                  <p className={`text-sm ${
                                    theme === 'dark' ? 'text-slate-300' :
                                    theme === 'h12' ? 'text-slate-600' :
                                    theme === 'h12-alt' ? 'text-slate-400' :
                                    'text-slate-600'
                                  }`}>
                                    A atividade foi cancelada
                                  </p>
                                  <p className={`text-xs mt-1 ${
                                    theme === 'dark' ? 'text-slate-500' :
                                    theme === 'h12' ? 'text-slate-400' :
                                    theme === 'h12-alt' ? 'text-slate-500' :
                                    'text-slate-400'
                                  }`}>
                                    {formatDateTime(activity.updatedAt)}
                                  </p>
                                </div>
                              </div>
                      </div>
                  )}
                        </div>
                      </div>

                      {/* System Information */}
                      <div className="mt-8 p-6 rounded-lg border">
                        <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                          theme === 'dark' ? 'text-slate-100' :
                          theme === 'h12' ? 'text-slate-900' :
                          theme === 'h12-alt' ? 'text-slate-200' :
                          'text-slate-900'
                        }`}>
                          <div className={`p-1.5 rounded-md ${
                            theme === 'dark' ? 'bg-slate-800/50' :
                            theme === 'h12' ? 'bg-slate-100' :
                            theme === 'h12-alt' ? 'bg-slate-700/50' :
                            'bg-slate-100'
                          }`}>
                            <ClockIcon className={`h-4 w-4 ${
                              theme === 'dark' ? 'text-slate-300' :
                              theme === 'h12' ? 'text-slate-600' :
                              theme === 'h12-alt' ? 'text-slate-400' :
                              'text-slate-600'
                            }`} />
                          </div>
                          Informações do Sistema
                        </h3>

                        <div className="grid gap-4">
                          <div className={`flex items-center gap-3 p-3 rounded-lg ${
                            theme === 'dark' ? 'bg-slate-800/30' :
                            theme === 'h12' ? 'bg-muted/20' :
                            theme === 'h12-alt' ? 'bg-slate-700/30' :
                            'bg-muted/20'
                          }`}>
                            <ClockIcon className={`h-4 w-4 flex-shrink-0 ${
                              theme === 'dark' ? 'text-slate-400' :
                              theme === 'h12' ? 'text-muted-foreground' :
                              theme === 'h12-alt' ? 'text-slate-400' :
                              'text-muted-foreground'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium uppercase tracking-wide ${
                                theme === 'dark' ? 'text-slate-300' :
                                theme === 'h12' ? 'text-muted-foreground' :
                                theme === 'h12-alt' ? 'text-slate-300' :
                                'text-muted-foreground'
                              }`}>Última atualização</p>
                              <p className={`text-sm ${
                                theme === 'dark' ? 'text-slate-100' :
                                theme === 'h12' ? 'text-foreground' :
                                theme === 'h12-alt' ? 'text-slate-100' :
                                'text-foreground'
                              }`}>
                                {formatDistanceToNow(parseISO(activity.updatedAt), {
                                  addSuffix: true,
                                  locale: ptBR
                                })} ({formatDateTime(activity.updatedAt)})
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>

          {/* Sidebar com informações rápidas */}
          <div className="xl:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl">Resumo Rápido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium mb-1.5 text-muted-foreground">Tipo de Atividade</h4>
                  <div className="flex items-center">
                    <Badge variant="outline" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      {activity.type || "Não especificado"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-medium mb-1.5 text-muted-foreground">Prioridade</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      activity.priority === 'high' ? 'destructive' :
                      activity.priority === 'medium' ? 'secondary' : 'outline'
                    } className="text-xs sm:text-sm">
                      {getPriorityLabel(activity.priority)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-medium mb-1.5 text-muted-foreground">Responsáveis</h4>
                  <div className="text-xs sm:text-sm leading-relaxed">
                    {getAssigneeNames(activity.assignedTo)}
                  </div>
                </div>

                {client && (
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium mb-1.5 text-muted-foreground">Cliente</h4>
                    <div className="text-xs sm:text-sm font-medium truncate">
                      {client.type === 'juridica'
                        ? (client as any).companyName || client.name
                        : client.name}
                    </div>
                  </div>
                )}
              </CardContent>

              {activity.status !== "completed" && activity.status !== "cancelled" && (
                <CardFooter className="pt-3 sm:pt-4">
                  <Button
                    onClick={() => navigate(`/activities/edit/${id}`)}
                    className="w-full text-sm sm:text-base"
                  >
                    <FileEdit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Editar Atividade
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>
  );
};

export default ActivityDetailsPage;