
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  XCircle,
  Filter,
  CalendarIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { 
  getActivities, 
  Activity, 
  ActivityStatus, 
  updateActivityStatus 
} from "@/services/firebase/activities";
import { getClients, Client } from "@/services/firebase/clients";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const ActivitiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilters, setStatusFilters] = useState<ActivityStatus[]>([]);
  const [dateType, setDateType] = useState<"startDate" | "endDate">("startDate");
  const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined);
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch activities
        const fetchedActivities = await getActivities();
        setActivities(fetchedActivities);
        setFilteredActivities(fetchedActivities);
        
        // Fetch clients to get their names
        const fetchedClients = await getClients();
        const clientsMap: Record<string, Client> = {};
        fetchedClients.forEach(client => {
          clientsMap[client.id] = client;
        });
        setClients(clientsMap);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar as atividades."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    // Filter by search term, status and period
    let filtered = activities;
    
    // Apply status filters
    if (statusFilters.length > 0) {
      filtered = filtered.filter(activity => statusFilters.includes(activity.status));
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(activity => {
        const clientName = clients[activity.clientId] 
          ? (clients[activity.clientId].type === 'juridica' 
            ? (clients[activity.clientId] as any).companyName 
            : clients[activity.clientId].name)
          : '';
          
        return activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clientName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    // Apply date period filters
    if (startPeriod || endPeriod) {
      filtered = filtered.filter(activity => {
        const activityDate = new Date(dateType === "startDate" ? activity.startDate : (activity.endDate || activity.startDate));
        
        if (startPeriod && endPeriod) {
          // Both dates provided - check if activity date is within range
          return activityDate >= startPeriod && activityDate <= endPeriod;
        } else if (startPeriod) {
          // Only start date provided - check if activity date is after or equal to start date
          return activityDate >= startPeriod;
        } else if (endPeriod) {
          // Only end date provided - check if activity date is before or equal to end date
          return activityDate <= endPeriod;
        }
        
        return true;
      });
    }
    
    // Sort by date and status (pending first, then in-progress, then completed, then cancelled)
    filtered = [...filtered].sort((a, b) => {
      // First by status priority
      const statusPriority: Record<ActivityStatus, number> = {
        'pending': 0,
        'in-progress': 1,
        'completed': 2,
        'cancelled': 3
      };
      
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Then by start date (most recent first)
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
    
    setFilteredActivities(filtered);
  }, [searchTerm, statusFilters, activities, clients, dateType, startPeriod, endPeriod]);

  const getStatusBadge = (status: ActivityStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <Clock className="h-3 w-3 mr-1" /> Pendente
          </Badge>
        );
      case "in-progress":
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            <RotateCcw className="h-3 w-3 mr-1" /> Em Progresso
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Concluída
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">
            <XCircle className="h-3 w-3 mr-1" /> Cancelada
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority: Activity["priority"]) => {
    switch (priority) {
      case "low":
        return <Badge variant="outline">Baixa</Badge>;
      case "medium":
        return <Badge variant="secondary">Média</Badge>;
      case "high":
        return <Badge variant="destructive">Alta</Badge>;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients[clientId];
    if (!client) return "Cliente não encontrado";
    
    return client.type === 'juridica' 
      ? (client as any).companyName 
      : client.name;
  };

  const handleStatusChange = async (activityId: string, newStatus: ActivityStatus) => {
    if (!user?.uid) return;
    
    try {
      await updateActivityStatus(activityId, newStatus, user.uid);
      
      // Update the activities list
      setActivities(prevActivities => 
        prevActivities.map(activity => 
          activity.id === activityId 
            ? { ...activity, status: newStatus, updatedAt: new Date().toISOString() } 
            : activity
        )
      );
      
      toast({
        title: "Status atualizado",
        description: `A atividade foi marcada como ${
          newStatus === 'pending' ? 'pendente' : 
          newStatus === 'in-progress' ? 'em progresso' : 
          newStatus === 'completed' ? 'concluída' : 
          'cancelada'
        }.`
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status da atividade."
      });
    }
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

  const isStatusFilterActive = (status: ActivityStatus) => {
    return statusFilters.includes(status);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilters([]);
    setStartPeriod(undefined);
    setEndPeriod(undefined);
    setDateType("startDate");
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Gerenciamento de Atividades</h1>
        <Button onClick={() => navigate("/activities/new")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar atividades..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex gap-2 items-center">
                <Filter className="h-4 w-4" />
                <span>Filtros Avançados</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <h3 className="font-medium">Filtrar por Período</h3>
                
                <div>
                  <Label className="mb-1 block">Tipo de Data</Label>
                  <RadioGroup 
                    value={dateType} 
                    onValueChange={(value) => setDateType(value as "startDate" | "endDate")}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="startDate" id="period-start-date" />
                      <Label htmlFor="period-start-date">Data de Início</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="endDate" id="period-end-date" />
                      <Label htmlFor="period-end-date">Data de Término</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div>
                  <Label className="mb-1 block">Início do Período</Label>
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
                      <CalendarComponent
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
                  <Label className="mb-1 block">Fim do Período</Label>
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
                      <CalendarComponent
                        mode="single"
                        selected={endPeriod}
                        onSelect={setEndPeriod}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetFilters}
                  >
                    Limpar Filtros
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={statusFilters.length === 0 ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilters([])}
          >
            Todas
          </Button>
          <Button 
            variant={isStatusFilterActive("pending") ? "default" : "outline"} 
            size="sm"
            onClick={() => toggleStatusFilter("pending")}
            className={isStatusFilterActive("pending") ? "" : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"}
          >
            <Clock className="h-4 w-4 mr-1" />
            Pendentes
          </Button>
          <Button 
            variant={isStatusFilterActive("in-progress") ? "default" : "outline"} 
            size="sm"
            onClick={() => toggleStatusFilter("in-progress")}
            className={isStatusFilterActive("in-progress") ? "" : "border-blue-200 text-blue-700 hover:bg-blue-50"}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Em Progresso
          </Button>
          <Button 
            variant={isStatusFilterActive("completed") ? "default" : "outline"} 
            size="sm"
            onClick={() => toggleStatusFilter("completed")}
            className={isStatusFilterActive("completed") ? "" : "border-green-200 text-green-700 hover:bg-green-50"}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Concluídas
          </Button>
          <Button 
            variant={isStatusFilterActive("cancelled") ? "default" : "outline"} 
            size="sm"
            onClick={() => toggleStatusFilter("cancelled")}
            className={isStatusFilterActive("cancelled") ? "" : "border-red-200 text-red-700 hover:bg-red-50"}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Canceladas
          </Button>
        </div>
        
        {statusFilters.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="px-3 py-1">
              Filtrando por status: {statusFilters.map(status => 
                status === "pending" ? "Pendente" :
                status === "in-progress" ? "Em Progresso" :
                status === "completed" ? "Concluída" :
                "Cancelada"
              ).join(", ")}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStatusFilters([])}>
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {(startPeriod || endPeriod) && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="px-3 py-1">
              <CalendarIcon className="h-3 w-3 mr-1" />
              Filtrando por {dateType === "startDate" ? "Data de Início" : "Data de Término"}:
              {startPeriod && !endPeriod && (
                <> a partir de {format(startPeriod, "dd/MM/yyyy")}</>
              )}
              {!startPeriod && endPeriod && (
                <> até {format(endPeriod, "dd/MM/yyyy")}</>
              )}
              {startPeriod && endPeriod && (
                <> de {format(startPeriod, "dd/MM/yyyy")} até {format(endPeriod, "dd/MM/yyyy")}</>
              )}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
              setStartPeriod(undefined);
              setEndPeriod(undefined);
            }}>
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredActivities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredActivities.map((activity) => (
            <Card key={activity.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {activity.title}
                      {getPriorityBadge(activity.priority)}
                    </CardTitle>
                    <CardDescription>
                      Cliente: {getClientName(activity.clientId)}
                    </CardDescription>
                  </div>
                  <div>
                    {getStatusBadge(activity.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm line-clamp-2">{activity.description}</p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>
                      {new Date(activity.startDate).toLocaleDateString('pt-BR')}
                      {activity.endDate && ` - ${new Date(activity.endDate).toLocaleDateString('pt-BR')}`}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <div className="flex justify-end w-full gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/activities/${activity.id}`)}
                  >
                    Detalhes
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => navigate(`/activities/edit/${activity.id}`)}
                  >
                    Editar
                  </Button>
                </div>
                
                {activity.status !== 'completed' && activity.status !== 'cancelled' && (
                  <div className="flex justify-between w-full">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => handleStatusChange(activity.id, 'cancelled')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    
                    {activity.status === 'pending' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => handleStatusChange(activity.id, 'in-progress')}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-green-200 text-green-700 hover:bg-green-50"
                        onClick={() => handleStatusChange(activity.id, 'completed')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Concluir
                      </Button>
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-10 border rounded-lg bg-muted/10">
          <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilters.length > 0 || startPeriod || endPeriod
              ? "Não encontramos resultados com os filtros aplicados."
              : "Nenhuma atividade cadastrada no sistema."}
          </p>
          {searchTerm || statusFilters.length > 0 || startPeriod || endPeriod ? (
            <Button onClick={resetFilters} className="mr-2">
              Limpar Filtros
            </Button>
          ) : null}
          <Button onClick={() => navigate("/activities/new")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Atividade
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
