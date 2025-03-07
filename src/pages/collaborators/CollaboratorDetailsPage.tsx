import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUserData, UserData } from "@/services/firebase/auth";
import { getActivitiesByAssignee, Activity, ActivityStatus } from "@/services/firebase/activities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserCheck, UserX, Calendar, Clock, FileEdit, ArrowLeft, 
  List, CircleAlert, Briefcase, Mail, Phone, BadgeCheck, 
  Search, Filter, CalendarIcon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const CollaboratorDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collaborator, setCollaborator] = useState<UserData & { uid: string } | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "all">("all");
  const [dateType, setDateType] = useState<"startDate" | "endDate">("startDate");
  const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined);
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!id) return;

        const userRef = ref(db, `users/${id}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val() as UserData;
          setCollaborator({ ...userData, uid: id });
        } else {
          setCollaborator(null);
        }

        const userActivities = await getActivitiesByAssignee(id);
        setActivities(userActivities);
        setFilteredActivities(userActivities);
      } catch (error) {
        console.error("Erro ao buscar dados do colaborador:", error);
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
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(activity => activity.status === statusFilter);
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
  }, [activities, searchTerm, statusFilter, dateType, startPeriod, endPeriod]);

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

  if (!collaborator) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="text-center p-10 border rounded-lg bg-muted/10">
          <CircleAlert className="mx-auto h-10 w-10 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Colaborador não encontrado</h3>
          <p className="text-muted-foreground mb-4">
            O colaborador que você está procurando não foi encontrado ou foi removido.
          </p>
          <Button onClick={() => navigate("/collaborators")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Lista de Colaboradores
          </Button>
        </div>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Administrador</Badge>;
      case "manager":
        return <Badge variant="default">Gerente</Badge>;
      case "collaborator":
        return <Badge variant="outline">Colaborador</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = () => {
    return collaborator.active ? (
      <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
        <UserCheck className="h-3 w-3 mr-1" /> Ativo
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">
        <UserX className="h-3 w-3 mr-1" /> Inativo
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartPeriod(undefined);
    setEndPeriod(undefined);
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/collaborators")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold flex items-center">
          {collaborator.name}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/collaborators/edit/${id}`)}>
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
                  <CardTitle>Dados do Colaborador</CardTitle>
                  <CardDescription>
                    Informações detalhadas do perfil do colaborador
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Status:</span>
                    <span>{getStatusBadge()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Cargo:</span>
                    <span>{getRoleBadge(collaborator.role)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">E-mail:</span>
                    <span>{collaborator.email}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Telefone:</span>
                    <span>{collaborator.phone}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">CPF:</span>
                    <span>{collaborator.cpf}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-medium">Data de Admissão:</span>
                    <span>{new Date(collaborator.admissionDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {'address' in collaborator && collaborator.address && (
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium">Endereço:</span>
                      <span>{collaborator.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="activities" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Atividades Atribuídas</CardTitle>
                    <CardDescription>
                      Lista de atividades atribuídas a este colaborador
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => navigate("/activities/new", { state: { assigneeId: id } })}>
                    Nova Atividade
                  </Button>
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="mb-1 block">Status</Label>
                          <Select 
                            value={statusFilter} 
                            onValueChange={(value) => setStatusFilter(value as ActivityStatus | "all")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Filtrar por status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os status</SelectItem>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="in-progress">Em Progresso</SelectItem>
                              <SelectItem value="completed">Concluída</SelectItem>
                              <SelectItem value="cancelled">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
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
                          {searchTerm || statusFilter !== "all" || startPeriod || endPeriod ? 
                            "Não foram encontradas atividades com os filtros aplicados." : 
                            "Este colaborador ainda não possui atividades atribuídas."}
                        </p>
                        {searchTerm || statusFilter !== "all" || startPeriod || endPeriod ? (
                          <Button onClick={resetFilters}>Limpar Filtros</Button>
                        ) : (
                          <Button onClick={() => navigate("/activities/new", { state: { assigneeId: id } })}>
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
                  <h4 className="text-sm font-medium mb-1">Perfil</h4>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(collaborator.role)}
                    {getStatusBadge()}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Contato</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      {collaborator.email}
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      {collaborator.phone}
                    </div>
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
                  <h4 className="text-sm font-medium mb-1">Tempo de Empresa</h4>
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      Desde {new Date(collaborator.admissionDate).toLocaleDateString('pt-BR')}
                      </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate(`/collaborators/edit/${id}`)}
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Editar Colaborador
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorDetailsPage;
