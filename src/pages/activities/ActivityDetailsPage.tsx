import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getActivityById, Activity, updateActivityStatus, deleteActivity } from "@/services/firebase/activities";
import { getClientById, Client } from "@/services/firebase/clients";
import { getUserData, UserData } from "@/services/firebase/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Clock, FileEdit, CircleAlert, CheckCircle, Play, Ban, ClipboardList, AlertTriangle, UserCircle, Trash2, Building2 } from "lucide-react";
import { formatDistanceToNow, format, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const getStatusLabel = (status: "pending" | "in-progress" | "completed" | "cancelled") => {
  switch (status) {
    case "pending":
      return "Futura";
    case "in-progress":
      return "Em Andamento";
    case "completed":
      return "Concluída";
    case "cancelled":
      return "Cancelada";
    default:
      return "Desconhecido";
  }
};

const formatDate = (date: string | undefined) => {
  if (!date) return "Não definida";
  
  const parsedDate = parseISO(date);
  
  return format(parsedDate, "dd/MM/yyyy");
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
  }, [id]);

  const handleStatusChange = async (newStatus: "pending" | "in-progress" | "completed" | "cancelled") => {
    if (!activity || !user) return;
    
    try {
      setStatusLoading(true);
      await updateActivityStatus(activity.id, newStatus, user.uid);
      
      setActivity({
        ...activity,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...(newStatus === "completed" ? { completedDate: new Date().toISOString() } : {})
      });
      
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
    if (!activity) return;
    
    try {
      setDeleteLoading(true);
      await deleteActivity(activity.id);
      
      toast({
        title: "Atividade cancelada",
        description: "A atividade foi cancelada com sucesso."
      });
      
      setActivity({
        ...activity,
        status: "cancelled",
        updatedAt: new Date().toISOString()
      });
      
      setDeleteLoading(false);
      
      setTimeout(() => {
        navigate("/activities");
      }, 1500);
    } catch (error) {
      console.error("Erro ao cancelar atividade:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível cancelar a atividade."
      });
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
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
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
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

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/activities")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">
          {activity?.title}
        </h1>
        <div className="ml-auto flex gap-2">
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
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar atividade</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja cancelar esta atividade? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteActivity}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? "Cancelando..." : "Cancelar atividade"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Atividade</CardTitle>
              <CardDescription>
                Detalhes sobre a atividade selecionada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Status:</span>
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
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Cliente:</span>
                <div className="flex items-center">
                  {client ? (
                    <>
                      {client.type === 'juridica' ? (
                        <Building2 className="h-4 w-4 mr-1" />
                      ) : (
                        <UserCircle className="h-4 w-4 mr-1" />
                      )}
                      <span>{client.type === 'juridica' 
                        ? (client as any).companyName || client.name 
                        : client.name}
                      </span>
                    </>
                  ) : (
                    <span>Carregando...</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Responsáveis:</span>
                <div>
                  {assigneesLoading ? (
                    <span className="text-sm text-muted-foreground">Carregando responsáveis...</span>
                  ) : Object.entries(assignees).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(assignees).map(([userId, assignee]) => (
                        <div key={userId} className="flex items-center space-x-2">
                          <UserCircle className="h-4 w-4" />
                          <span>{assignee?.name || 'Usuário não encontrado'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum responsável atribuído</span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Prioridade:</span>
                  <span>{activity.priority}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Data de Início:</span>
                  <span>{formatDate(activity.startDate)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Data de Término:</span>
                  <span>{formatDate(activity.endDate)}</span>
                </div>
                {activity.completedDate && (
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Data de Conclusão:</span>
                    <span>{formatDate(activity.completedDate)}</span>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Descrição</h4>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              {activity.status !== "completed" && activity.status !== "cancelled" && (
                <Button variant="outline" onClick={() => navigate(`/activities/edit/${id}`)}>
                  <FileEdit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

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
                    Criado em: {format(new Date(activity.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Última atualização: {formatDistanceToNow(new Date(activity.updatedAt), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Status atual: {getStatusLabel(activity.status)}
                  </p>
                </div>
                {activity.status === "completed" && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Concluído em: {formatDate(activity.completedDate)}
                    </p>
                  </div>
                )}
                {activity.status === "cancelled" && (
                  <div className="flex items-center space-x-2">
                    <Ban className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Cancelado em: {format(new Date(activity.updatedAt), "dd/MM/yyyy HH:mm")}
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
