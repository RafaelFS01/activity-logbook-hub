import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getActivityById, Activity, ActivityStatus, updateActivityStatus } from "@/services/firebase/activities";
import { getClientById, Client } from "@/services/firebase/clients";
import { getUserData, UserData } from "@/services/firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, FileEdit, ArrowLeft, Clock, CircleAlert, 
  CheckCircle, Play, AlertCircle, XCircle, User, CalendarClock, 
  List, Briefcase, Calendar as CalendarIcon, Timer
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

const ActivityDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [assignees, setAssignees] = useState<(UserData & { uid: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!id) return;

        const activityData = await getActivityById(id);
        setActivity(activityData);

        if (activityData) {
          const clientData = await getClientById(activityData.clientId);
          setClient(clientData);

          const usersData: (UserData & { uid: string })[] = [];
          for (const assigneeId of activityData.assignedTo) {
            const userRef = ref(db, `users/${assigneeId}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
              const userData = snapshot.val() as UserData;
              usersData.push({ ...userData, uid: assigneeId });
            }
          }
          setAssignees(usersData);
        }
      } catch (error) {
        console.error("Erro ao buscar dados da atividade:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const updateStatus = async (newStatus: ActivityStatus) => {
    try {
      if (!id || !user?.uid) return;
      
      await updateActivityStatus(id, newStatus, user.uid);
      
      setActivity(prev => prev ? { ...prev, status: newStatus } : null);
      
      toast({
        title: "Status atualizado",
        description: `A atividade foi marcada como ${
          newStatus === 'completed' ? 'concluída' : 
          newStatus === 'in-progress' ? 'em andamento' : 
          newStatus === 'cancelled' ? 'cancelada' : 'pendente'
        }`,
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da atividade",
        variant: "destructive",
      });
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

  const getStatusBadge = (status: ActivityStatus) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" /> Concluída
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Play className="h-3 w-3 mr-1" /> Em andamento
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" /> Pendente
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" /> Cancelada
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: Activity['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge variant="default">Média</Badge>;
      case 'low':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusActions = () => {
    if (activity.status === 'completed' || activity.status === 'cancelled') {
      return (
        <Button
          variant="outline"
          onClick={() => updateStatus('pending')}
          className="w-full"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Reabrir como Pendente
        </Button>
      );
    }

    return (
      <div className="flex gap-2 flex-col">
        {activity.status !== 'in-progress' && (
          <Button
            onClick={() => updateStatus('in-progress')}
            variant="default"
          >
            <Play className="h-4 w-4 mr-2" />
            Iniciar Atividade
          </Button>
        )}
        
        <Button
          onClick={() => updateStatus('completed')}
          variant="outline"
          className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Concluir Atividade
        </Button>
        
        <Button
          onClick={() => updateStatus('cancelled')}
          variant="outline"
          className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancelar Atividade
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/activities")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold flex items-center">
          {activity.title}
        </h1>
        <div className="ml-auto flex gap-2">
          {getStatusBadge(activity.status)}
          <Button variant="outline" onClick={() => navigate(`/activities/edit/${id}`)}>
            <FileEdit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Detalhes da Atividade</CardTitle>
              <CardDescription>
                Informações detalhadas sobre a atividade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Descrição:</h3>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {activity.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Status:</span>
                    <span>{getStatusBadge(activity.status)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Prioridade:</span>
                    <span>{getPriorityBadge(activity.priority)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Cliente:</span>
                    <span className="flex items-center">
                      {client ? (
                        <Button 
                          variant="link" 
                          className="h-auto p-0" 
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          {client.type === 'juridica' 
                            ? (client as any).companyName
                            : client.name}
                        </Button>
                      ) : (
                        "Cliente não encontrado"
                      )}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Data de início:</span>
                    <span>{formatDate(activity.startDate)}</span>
                  </div>
                  {activity.endDate && (
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium">Data de término:</span>
                      <span>{formatDate(activity.endDate)}</span>
                    </div>
                  )}
                  {activity.completedDate && (
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium">Data de conclusão:</span>
                      <span>{formatDate(activity.completedDate)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Criação:</span>
                    <span>{formatDate(activity.createdAt)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colaboradores Responsáveis</CardTitle>
              <CardDescription>
                Colaboradores atribuídos a esta atividade
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignees.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {assignees.map((assignee) => (
                    <Card key={assignee.uid} className="overflow-hidden">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{assignee.name}</CardTitle>
                            <CardDescription>{assignee.email}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span className="text-muted-foreground">Cargo:</span>
                          <span className="font-medium">
                            {assignee.role === 'admin' ? 'Administrador' : 
                             assignee.role === 'manager' ? 'Gerente' : 'Colaborador'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Telefone:</span>
                          <span>{assignee.phone}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/50 p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => navigate(`/collaborators/${assignee.uid}`)}
                        >
                          Ver detalhes
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6">
                  <User className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-medium mb-2">Nenhum colaborador atribuído</h3>
                  <p className="text-muted-foreground mb-4">
                    Esta atividade não possui colaboradores atribuídos.
                  </p>
                  <Button onClick={() => navigate(`/activities/edit/${id}`)}>
                    Atribuir Colaboradores
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Status da Atividade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Situação atual</h4>
                <div className="flex items-center">
                  {getStatusBadge(activity.status)}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Cronograma</h4>
                <div className="space-y-1">
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Início: {formatDate(activity.startDate)}</span>
                  </div>
                  {activity.endDate && (
                    <div className="flex items-center text-sm">
                      <CalendarClock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Previsão de término: {formatDate(activity.endDate)}</span>
                    </div>
                  )}
                  {activity.endDate && !activity.completedDate && activity.status !== 'cancelled' && (
                    <div className="flex items-center text-sm mt-1">
                      <Timer className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        {differenceInDays(new Date(activity.endDate), new Date()) > 0
                          ? `Faltam ${differenceInDays(new Date(activity.endDate), new Date())} dias`
                          : differenceInDays(new Date(activity.endDate), new Date()) === 0
                          ? "Vence hoje"
                          : `Atrasada em ${Math.abs(differenceInDays(new Date(activity.endDate), new Date()))} dias`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Ações</h4>
                {getStatusActions()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Prioridade</h4>
                <div className="flex items-center">
                  {getPriorityBadge(activity.priority)}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Cliente</h4>
                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                  {client ? (
                    <span className="text-sm">
                      {client.type === 'juridica' 
                        ? (client as any).companyName
                        : client.name}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Cliente não encontrado</span>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Atribuída a</h4>
                <div className="flex items-center">
                  <List className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{assignees.length} colaboradores</span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Última atualização</h4>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(activity.updatedAt), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate(`/activities/edit/${id}`)}
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Editar Atividade
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailsPage;
