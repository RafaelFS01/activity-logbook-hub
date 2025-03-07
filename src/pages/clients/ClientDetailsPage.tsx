
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getClientById, Client } from "@/services/firebase/clients";
import { getActivitiesByClient, Activity } from "@/services/firebase/activities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, Building2, CheckCircle2, XCircle, Calendar, 
  Clock, FileEdit, ArrowLeft, List, CircleAlert 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ClientDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!id) return;

        // Buscar dados do cliente
        const clientData = await getClientById(id);
        setClient(clientData);

        // Buscar atividades relacionadas ao cliente
        const clientActivities = await getActivitiesByClient(id);
        setActivities(clientActivities);
      } catch (error) {
        console.error("Erro ao buscar dados do cliente:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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

  if (!client) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="text-center p-10 border rounded-lg bg-muted/10">
          <CircleAlert className="mx-auto h-10 w-10 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Cliente não encontrado</h3>
          <p className="text-muted-foreground mb-4">
            O cliente que você está procurando não foi encontrado ou foi removido.
          </p>
          <Button onClick={() => navigate("/clients")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Lista de Clientes
          </Button>
        </div>
      </div>
    );
  }

  const getClientTypeIcon = () => {
    return client.type === 'juridica' ? 
      <Building2 className="h-5 w-5 mr-2" /> : 
      <User className="h-5 w-5 mr-2" />;
  };

  const getStatusBadge = () => {
    return client.active ? (
      <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">
        <XCircle className="h-3 w-3 mr-1" /> Inativo
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/clients")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold flex items-center">
          {getClientTypeIcon()}
          {client.type === 'juridica' 
            ? (client as any).companyName
            : client.name
          }
        </h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/clients/edit/${id}`)}>
            <FileEdit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="activities">Atividades</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Cliente</CardTitle>
                  <CardDescription>
                    {client.type === 'juridica' 
                      ? 'Informações da pessoa jurídica'
                      : 'Informações da pessoa física'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Status:</span>
                    <span>{getStatusBadge()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">E-mail:</span>
                    <span>{client.email}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Telefone:</span>
                    <span>{client.phone}</span>
                  </div>
                  {client.type === 'fisica' ? (
                    <>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="font-medium">CPF:</span>
                        <span>{(client as any).cpf}</span>
                      </div>
                      {(client as any).rg && (
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="font-medium">RG:</span>
                          <span>{(client as any).rg}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="font-medium">CNPJ:</span>
                        <span>{(client as any).cnpj}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="font-medium">Razão Social:</span>
                        <span>{(client as any).companyName}</span>
                      </div>
                      {(client as any).responsibleName && (
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="font-medium">Responsável:</span>
                          <span>{(client as any).responsibleName}</span>
                        </div>
                      )}
                    </>
                  )}
                  {client.address && (
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium">Endereço:</span>
                      <span>{client.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Criado em:</span>
                    <span>{formatDate(client.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Última atualização:</span>
                    <span>{formatDate(client.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="activities" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Atividades</CardTitle>
                    <CardDescription>
                      Lista de atividades relacionadas a este cliente
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => navigate("/activities/new", { state: { clientId: id } })}>
                    Nova Atividade
                  </Button>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <Card key={activity.id} className="overflow-hidden">
                          <CardHeader className="p-4">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-base">{activity.title}</CardTitle>
                              <Badge
                                className={
                                  activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  activity.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                  activity.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }
                              >
                                {activity.status === 'completed' ? 'Concluída' :
                                 activity.status === 'in-progress' ? 'Em andamento' :
                                 activity.status === 'cancelled' ? 'Cancelada' :
                                 'Pendente'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {activity.description}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>Início: {new Date(activity.startDate).toLocaleDateString('pt-BR')}</span>
                              {activity.endDate && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span>Fim: {new Date(activity.endDate).toLocaleDateString('pt-BR')}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>
                                {formatDistanceToNow(new Date(activity.updatedAt), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </span>
                            </div>
                          </CardContent>
                          <CardFooter className="p-2 bg-muted/50">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-auto"
                              onClick={() => navigate(`/activities/${activity.id}`)}
                            >
                              Ver detalhes
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <List className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
                      <p className="text-muted-foreground mb-4">
                        Este cliente ainda não possui atividades registradas.
                      </p>
                      <Button onClick={() => navigate("/activities/new", { state: { clientId: id } })}>
                        Nova Atividade
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Tipo de Cliente</h4>
                  <div className="flex items-center">
                    {client.type === 'juridica' ? (
                      <Badge variant="secondary" className="flex items-center">
                        <Building2 className="h-3 w-3 mr-1" />
                        Pessoa Jurídica
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        Pessoa Física
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Atividades</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-muted p-2">
                      <p className="text-sm font-medium">Total</p>
                      <p className="text-2xl font-bold">{activities.length}</p>
                    </div>
                    <div className="rounded-md bg-muted p-2">
                      <p className="text-sm font-medium">Concluídas</p>
                      <p className="text-2xl font-bold">
                        {activities.filter(a => a.status === 'completed').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  {getStatusBadge()}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate(`/clients/edit/${id}`)}
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Editar Cliente
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsPage;
