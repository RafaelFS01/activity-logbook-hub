import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getClientById, Client } from "@/services/firebase/clients";
import { getActivitiesByClient, Activity, ActivityStatus } from "@/services/firebase/activities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, Building2, CheckCircle2, XCircle, Clock, FileEdit, 
  ArrowLeft, List, CircleAlert, Search, Filter,
  Calendar as CalendarIcon, RotateCcw, FileSpreadsheet
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { exportActivitiesToExcel } from "@/utils/exportUtils";
import { UserData } from "@/types";
import { PessoaJuridicaClient } from "@/types";

const ClientDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<ActivityStatus[]>([]);
  const [dateType, setDateType] = useState<"startDate" | "endDate">("startDate");
  const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined);
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined);
  const [collaborators, setCollaborators] = useState<Record<string, UserData & { uid: string }>>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!id) return;

        const clientData = await getClientById(id);
        if (clientData) {
          setClient(clientData);
        } else {
          setClient(null);
        }

        const clientActivities = await getActivitiesByClient(id);
        setActivities(clientActivities);
        setFilteredActivities(clientActivities);
        
        const usersRef = ref(db, 'users');
        const usersSnapshot = await get(usersRef);
        if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val();
          const collaboratorsMap: Record<string, UserData & { uid: string }> = {};
          
          Object.entries(usersData).forEach(([uid, userData]) => {
            collaboratorsMap[uid] = { ...(userData as UserData), uid };
          });
          
          setCollaborators(collaboratorsMap);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do cliente:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    let filtered = [...activities];
    
    if (searchTerm) {
      filtered = filtered.filter(activity => 
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilters.length > 0) {
      filtered = filtered.filter(activity => statusFilters.includes(activity.status));
    }
    
    if (startPeriod || endPeriod) {
      filtered = filtered.filter(activity => {
        const activityDate = new Date(dateType === "startDate" ? activity.startDate : (activity.endDate || activity.startDate));
        
        if (startPeriod && endPeriod) {
          return activityDate >= startPeriod && activityDate <= endPeriod;
        } else if (startPeriod) {
          return activityDate >= startPeriod;
        } else if (endPeriod) {
          return activityDate <= endPeriod;
        }
        
        return true;
      });
    }
    
    setFilteredActivities(filtered);
  }, [activities, searchTerm, statusFilters, dateType, startPeriod, endPeriod]);

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

  const toggleStatusFilter = (status: ActivityStatus) => {
    setStatusFilters(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilters([]);
    setStartPeriod(undefined);
    setEndPeriod(undefined);
  };

  const handleExport = () => {
    if (filteredActivities.length === 0) {
      toast({
        variant: "destructive",
        title: "Sem dados para exportar",
        description: "Não há atividades para exportar com os filtros atuais."
      });
      return;
    }

    try {
      const clientName = client?.type === 'juridica' 
        ? (client as PessoaJuridicaClient).companyName 
        : client?.name;
        
      const activitiesWithClientName = filteredActivities.map(activity => ({
        ...activity,
        clientName: clientName || ''
      }));
      
      const assigneeMap: Record<string, string> = {};
      Object.entries(collaborators).forEach(([id, user]) => {
        assigneeMap[id] = user.name;
      });
      
      exportActivitiesToExcel(
        activitiesWithClientName, 
        `atividades_${clientName?.replace(/\s+/g, '_')}.xlsx`,
        assigneeMap
      );
      
      toast({
        title: "Exportação concluída",
        description: `${filteredActivities.length} atividades foram exportadas com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao exportar atividades:', error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar as atividades."
      });
    }
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
                    <CardTitle>Atividades do Cliente</CardTitle>
                    <CardDescription>
                      Lista de atividades associadas a este cliente
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleExport}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Exportar
                    </Button>
                    <Button size="sm" onClick={() => navigate("/activities/new", { state: { clientId: id } })}>
                      Nova Atividade
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Buscar atividades..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="status-pending" 
                            checked={statusFilters.includes("pending")} 
                            onCheckedChange={() => toggleStatusFilter("pending")}
                          />
                          <Label htmlFor="status-pending" className="flex items-center cursor-pointer text-sm">
                            <Clock className="h-3 w-3 mr-1 text-yellow-600" /> Pendentes
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="status-in-progress" 
                            checked={statusFilters.includes("in-progress")} 
                            onCheckedChange={() => toggleStatusFilter("in-progress")}
                          />
                          <Label htmlFor="status-in-progress" className="flex items-center cursor-pointer text-sm">
                            <RotateCcw className="h-3 w-3 mr-1 text-blue-600" /> Em Progresso
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="status-completed" 
                            checked={statusFilters.includes("completed")} 
                            onCheckedChange={() => toggleStatusFilter("completed")}
                          />
                          <Label htmlFor="status-completed" className="flex items-center cursor-pointer text-sm">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> Concluídas
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="status-cancelled" 
                            checked={statusFilters.includes("cancelled")} 
                            onCheckedChange={() => toggleStatusFilter("cancelled")}
                          />
                          <Label htmlFor="status-cancelled" className="flex items-center cursor-pointer text-sm">
                            <XCircle className="h-3 w-3 mr-1 text-red-600" /> Canceladas
                          </Label>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="mb-1 block">Tipo de Data</Label>
                          <RadioGroup 
                            value={dateType} 
                            onValueChange={(value) => setDateType(value as "startDate" | "endDate")}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="startDate" id="start-date" />
                              <Label htmlFor="start-date">Data de Início</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="endDate" id="end-date" />
                              <Label htmlFor="end-date">Data de Término</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="mb-1 block">Período - Início</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !startPeriod && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startPeriod ? format(startPeriod, "dd/MM/yyyy") : <span>Selecionar data</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={startPeriod}
                                onSelect={setStartPeriod}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div>
                          <Label className="mb-1 block">Período - Fim</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !endPeriod && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endPeriod ? format(endPeriod, "dd/MM/yyyy") : <span>Selecionar data</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={endPeriod}
                                onSelect={setEndPeriod}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={resetFilters}>
                          Limpar Filtros
                        </Button>
                      </div>
                    </div>
                    
                    {filteredActivities.length > 0 ? (
                      <div className="space-y-4">
                        {filteredActivities.map((activity) => (
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
                                <CalendarIcon className="h-3 w-3 mr-1" />
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
                          {searchTerm || statusFilters.length > 0 || startPeriod || endPeriod ? 
                            "Não foram encontradas atividades com os filtros aplicados." : 
                            "Este cliente ainda não possui atividades registradas."}
                        </p>
                        {searchTerm || statusFilters.length > 0 || startPeriod || endPeriod ? (
                          <Button onClick={resetFilters}>Limpar Filtros</Button>
                        ) : (
                          <Button onClick={() => navigate("/activities/new", { state: { clientId: id } })}>
                            Nova Atividade
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
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
