import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Filter,
  CalendarIcon,
  FileSpreadsheet,
  ListFilter,
  Users // Certifique-se que Users está importado
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
import { UserData } from "@/services/firebase/auth";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  getActivities,
  Activity,
  ActivityStatus,
  updateActivityStatus,
  getActivityTypes
} from "@/services/firebase/activities";
import { getClients, Client } from "@/services/firebase/clients";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { exportActivitiesToExcel } from "@/utils/exportUtils";
import { Combobox } from "@/components/ui/combobox";
// import { Users } from "lucide-react"; // Já importado acima

// --- Constantes ---
const ITEMS_PER_PAGE = 15;
const SEARCH_DEBOUNCE_DELAY = 500; // Delay de 500ms para a busca

const ActivitiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  // Estado para o valor *real* da busca (debounced)
  const [searchTerm, setSearchTerm] = useState("");
  // Estado para o valor *imediato* do input de busca
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilters, setStatusFilters] = useState<ActivityStatus[]>([]);
  const [dateType, setDateType] = useState<"startDate" | "endDate">("startDate");
  const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined);
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Record<string, UserData & { uid: string }>>({});
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [selectedActivityType, setSelectedActivityType] = useState<string | null>(null);
  // Estado para a página atual da paginação
  const [currentPage, setCurrentPage] = useState(1);

  // --- UseEffects ---

  // Busca inicial de dados (atividades, clientes, colaboradores, tipos)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setActivities([]);
      setFilteredActivities([]);
      setClients({});
      setCollaborators({});
      setActivityTypes([]);

      try {
        // Busca Atividades
        let fetchedActivities: Activity[] = [];
        try {
          fetchedActivities = await getActivities();
        } catch (activityError) { /* ... tratamento de erro ... */
          console.error('Erro ao buscar atividades:', activityError);
          toast({ variant: "destructive", title: "Erro ao carregar Atividades", description: "Não foi possível buscar a lista de atividades." });
        }

        let activitiesToShow = fetchedActivities;
        if (user?.role === 'collaborator' && user?.uid) {
          activitiesToShow = fetchedActivities.filter(activity =>
              activity.assignedTo?.includes(user.uid)
          );
        }
        setActivities(activitiesToShow);

        // Busca Clientes
        try {
          const fetchedClients = await getClients();
          const clientsMap: Record<string, Client> = {};
          fetchedClients.forEach(client => { if (client?.id) { clientsMap[client.id] = client; } });
          setClients(clientsMap);
        } catch (clientError) { /* ... tratamento de erro ... */
          console.error('Erro ao buscar clientes:', clientError);
          toast({ variant: "destructive", title: "Erro ao carregar Clientes", description: "Não foi possível buscar os dados dos clientes." });
        }

        // Busca Colaboradores (users)
        try {
          const usersRef = ref(db, 'users');
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            const usersData = usersSnapshot.val();
            const collaboratorsMap: Record<string, UserData & { uid: string }> = {};
            Object.entries(usersData).forEach(([uid, userData]) => {
              const typedUserData = userData as UserData;
              if (uid && typedUserData && typeof typedUserData === 'object') {
                // Considerar filtrar usuários inativos aqui se necessário
                // if (typedUserData.active !== false) {
                collaboratorsMap[uid] = { ...typedUserData, uid };
                // }
              }
            });
            setCollaborators(collaboratorsMap);
          }
        } catch (userError) { /* ... tratamento de erro ... */
          console.error('Erro ao buscar colaboradores:', userError);
          toast({ variant: "destructive", title: "Erro ao carregar Colaboradores", description: "Não foi possível buscar os dados dos colaboradores." });
        }

        // Busca Tipos de Atividade
        try {
          const types = await getActivityTypes();
          setActivityTypes(types);
        } catch (typesError) { /* ... tratamento de erro ... */
          console.error('Erro ao buscar tipos de atividade:', typesError);
          toast({ variant: "destructive", title: "Erro ao carregar Tipos", description: "Não foi possível buscar os tipos de atividade." });
        }

      } catch (globalError) { /* ... tratamento de erro global ... */
        console.error("Erro inesperado no fetchData:", globalError);
        toast({ variant: "destructive", title: "Erro Inesperado", description: "Ocorreu um erro ao carregar os dados da página." });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    } else {
      // Limpa dados se não houver usuário
      setActivities([]); setFilteredActivities([]); setClients({}); setCollaborators({}); setActivityTypes([]); setIsLoading(false);
    }
  }, [toast, user]); // Depende de user e toast

  // MODIFICAÇÃO: useEffect para aplicar o debounce na busca
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(inputValue); // Atualiza o termo de busca real (debounced)
    }, SEARCH_DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler); // Limpa o timer anterior se o input mudar
    };
  }, [inputValue]); // Depende apenas do valor imediato do input

  // Efeito para filtrar e ordenar atividades (agora depende de 'searchTerm' debounced)
  useEffect(() => {
    let filtered = [...activities];

    // Filtro por Status
    if (statusFilters.length > 0) {
      filtered = filtered.filter(activity => statusFilters.includes(activity.status));
    }

    // Filtro por Termo de Busca (usando 'searchTerm' debounced)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(activity => {
        const clientData = activity.clientId ? clients[activity.clientId] : null;
        const clientName = clientData
            ? (clientData.type === 'juridica'
                ? (clientData as any).companyName?.toLowerCase() ?? ''
                : clientData.name?.toLowerCase() ?? '')
            : '';
        const responsibleNames = (activity.assignedTo ?? [])
            .map(id => collaborators[id]?.name?.toLowerCase() ?? '')
            .join(' ');

        return (activity.title?.toLowerCase() ?? '').includes(lowerSearchTerm) ||
            (activity.description?.toLowerCase() ?? '').includes(lowerSearchTerm) ||
            clientName.includes(lowerSearchTerm) ||
            responsibleNames.includes(lowerSearchTerm); // Adicionado busca por nome do responsável
      });
    }

    // Filtro por Período (Data)
    if (startPeriod || endPeriod) {
      filtered = filtered.filter(activity => {
        const dateStringToCompare = dateType === "startDate" ? activity.startDate : (activity.endDate || activity.startDate);
        if (!dateStringToCompare) return false;
        try {
          const activityDate = new Date(dateStringToCompare);
          if (isNaN(activityDate.getTime())) return false;
          const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const activityDay = startOfDay(activityDate);
          const startDay = startPeriod ? startOfDay(startPeriod) : null;
          const endDay = endPeriod ? startOfDay(endPeriod) : null;
          if (startDay && endDay) return activityDay >= startDay && activityDay <= endDay;
          if (startDay) return activityDay >= startDay;
          if (endDay) return activityDay <= endDay;
        } catch (e) { /* ... tratamento erro data ... */ return false; }
        return true;
      });
    }

    // Filtro por Colaborador Selecionado (Admin/Manager)
    if (selectedCollaboratorId && user && (user.role === 'admin' || user.role === 'manager')) {
      filtered = filtered.filter(activity =>
          Array.isArray(activity.assignedTo) && activity.assignedTo.includes(selectedCollaboratorId)
      );
    }

    // Filtro por Tipo de Atividade Selecionado
    if (selectedActivityType) {
      filtered = filtered.filter(activity =>
          activity.type === selectedActivityType
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      const statusPriority: Record<ActivityStatus, number> = { 'pending': 0, 'in-progress': 1, 'completed': 2, 'cancelled': 3 };
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;
      try {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA); // Mais recente primeiro
      } catch (e) { return 0; }
    });

    setFilteredActivities(filtered);
    setCurrentPage(1); // Reseta para a primeira página ao aplicar filtros

  }, [
    searchTerm, // Depende do termo debounced
    statusFilters,
    dateType,
    startPeriod,
    endPeriod,
    selectedCollaboratorId,
    selectedActivityType,
    user,
    activities,
    clients,
    collaborators // Adicionado collaborators como dependencia se a busca por nome for usada
  ]);

  // --- Cálculos Memoizados ---

  // Opções para Combobox de Colaborador
  const collaboratorOptions = useMemo(() => {
    if (!collaborators || Object.keys(collaborators).length === 0) return [];
    return Object.values(collaborators)
        // Opcional: Filtrar colaboradores inativos se houver campo 'active'
        // .filter(collab => collab.active !== false)
        .map(collab => ({
          value: collab.uid,
          label: collab.name || `Usuário ${collab.uid.substring(0, 6)}...`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
  }, [collaborators]);

  // Opções para Combobox de Tipo de Atividade
  const activityTypeOptions = useMemo(() => {
    if (!activityTypes || activityTypes.length === 0) return [];
    return activityTypes.map(type => ({
      value: type,
      label: type
    })).sort((a, b) => a.label.localeCompare(b.label)); // Ordenar tipos
  }, [activityTypes]);

  // Calcula as atividades para a página atual
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, currentPage]);

  // Calcula o número total de páginas
  const totalPages = useMemo(() => {
    return Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
  }, [filteredActivities]);

  // Scroll to top ao mudar de página
  useEffect(() => {
    if (currentPage > 0) { // Condição simples
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // --- Funções Auxiliares e Handlers ---

  const getStatusBadge = (status: ActivityStatus) => { /* ... código original ... */
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock className="h-3 w-3 mr-1" /> Futura</Badge>;
      case "in-progress": return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200"><RotateCcw className="h-3 w-3 mr-1" /> Em Progresso</Badge>;
      case "completed": return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluída</Badge>;
      case "cancelled": return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200"><XCircle className="h-3 w-3 mr-1" /> Cancelada</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getPriorityBadge = (priority: Activity["priority"]) => { /* ... código original ... */
    switch (priority) {
      case "low": return <Badge variant="outline">Baixa</Badge>;
      case "medium": return <Badge variant="secondary">Média</Badge>;
      case "high": return <Badge variant="destructive">Alta</Badge>;
      default: return null;
    }
  };

  const getClientName = (clientId: string | undefined): string => { /* ... código original ... */
    if (!clientId) return "Cliente não especificado";
    const client = clients[clientId];
    if (!client) return "Cliente não encontrado";
    return client.type === 'juridica'
        ? (client as any).companyName || 'Nome Fantasia Indisponível'
        : client.name || 'Nome Indisponível';
  };

  const getAssigneeNames = (assigneeIds: string[] | undefined): string => { /* ... código original ... */
    if (!assigneeIds || assigneeIds.length === 0) return 'Nenhum responsável';
    if (Object.keys(collaborators).length === 0 && isLoading) return 'Carregando...';
    if (Object.keys(collaborators).length === 0 && !isLoading) return 'Responsáveis não carregados';
    return assigneeIds
        .map(id => collaborators[id]?.name || `ID ${id.substring(0,6)}...`)
        .join(', ');
  };

  const handleStatusChange = async (activityId: string, newStatus: ActivityStatus) => { /* ... código original ... */
    if (!user?.uid) { /* ... erro auth ... */ return; }
    if (!activityId) return;
    const previousActivities = [...activities]; // Guarda estado original
    setActivities(prevActivities => // Atualiza otimisticamente
        prevActivities.map(activity =>
            activity.id === activityId
                ? { ...activity, status: newStatus, updatedAt: new Date().toISOString() }
                : activity
        )
    );
    try {
      await updateActivityStatus(activityId, newStatus, user.uid);
      toast({ title: "Status atualizado", description: `Atividade marcada como ${ { pending: 'futura', 'in-progress': 'em progresso', completed: 'concluída', cancelled: 'cancelada' }[newStatus] }.` });
    } catch (error) { // Rollback em caso de erro
      console.error('Erro ao atualizar status:', error);
      toast({ variant: "destructive", title: "Erro ao atualizar", description: "Não foi possível salvar a alteração de status. Revertendo." });
      setActivities(previousActivities);
    }
  };

  const toggleStatusFilter = (status: ActivityStatus) => { /* ... código original ... */
    setStatusFilters(prev =>
        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const isStatusFilterActive = (status: ActivityStatus) => statusFilters.includes(status);

  // MODIFICAÇÃO: Limpa também o inputValue
  const resetFilters = () => {
    setInputValue(""); // Limpa o campo de input
    setSearchTerm(""); // Limpa o termo de busca real
    setStatusFilters([]);
    setStartPeriod(undefined);
    setEndPeriod(undefined);
    setDateType("startDate");
    setSelectedCollaboratorId(null);
    setSelectedActivityType(null);
    setIsFilterOpen(false);
    setCurrentPage(1); // Volta para a primeira página
  };

  const handleExport = () => { /* ... código original ... */
    if (filteredActivities.length === 0) { /* ... erro sem dados ... */ return; }
    try {
      const activitiesToExport = filteredActivities.map(activity => ({
        // ... (propriedades originais + formatadas)
        ...activity,
        clientName: getClientName(activity.clientId),
        assigneeNames: getAssigneeNames(activity.assignedTo),
        startDateFormatted: activity.startDate ? format(new Date(activity.startDate), 'dd/MM/yyyy HH:mm') : '', // Incluir hora se relevante
        endDateFormatted: activity.endDate ? format(new Date(activity.endDate), 'dd/MM/yyyy HH:mm') : '',
        statusText: { pending: 'Futura', 'in-progress': 'Em Progresso', completed: 'Concluída', cancelled: 'Cancelada' }[activity.status] || activity.status,
        priorityText: { low: 'Baixa', medium: 'Média', high: 'Alta' }[activity.priority] || activity.priority || 'N/D',
      }));
      const assigneeMap: Record<string, string> = {};
      if (collaborators) { Object.entries(collaborators).forEach(([id, collab]) => { assigneeMap[id] = collab.name || `Usuário ${id.substring(0,6)}`; }); }
      exportActivitiesToExcel(activitiesToExport, 'atividades_exportadas.xlsx', assigneeMap);
      toast({ title: "Exportação Iniciada", description: `${filteredActivities.length} atividades estão sendo exportadas.` });
    } catch (error) { /* ... tratamento erro exportação ... */
      console.error('Erro ao exportar atividades:', error);
      toast({ variant: "destructive", title: "Erro na exportação", description: `Não foi possível exportar as atividades. ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  // --- Renderização do Componente ---
  return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Gerenciamento de Atividades</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport} disabled={isLoading || filteredActivities.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Visíveis
            </Button>
            <Button onClick={() => navigate("/activities/new")} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Atividade
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Linha 1: Busca, Colaborador, Tipo, Data */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center">
            {/* Input de Busca */}
            <div className="relative min-w-[200px] w-full sm:w-auto sm:flex-1"> {/* Ajustado para flex-1 */}
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Buscar título, cliente, responsável..."
                  className="pl-8 w-full"
                  // MODIFICAÇÃO: Controla o 'inputValue' (imediato)
                  value={inputValue}
                  // MODIFICAÇÃO: Atualiza o 'inputValue' no onChange
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
              />
            </div>
            {/* Combobox Colaborador */}
            {(user?.role === 'admin' || user?.role === 'manager') && ( // Mostra apenas para admin/manager
                <div className="min-w-[200px] w-full sm:w-auto">
                  <Combobox /* ... props ... */
                      id="collaborator-filter" options={collaboratorOptions} selectedValue={selectedCollaboratorId} onSelect={(value) => setSelectedCollaboratorId(value as string | null)} placeholder="Filtrar por colaborador" searchPlaceholder="Buscar colaborador..." noResultsText="Nenhum colaborador encontrado." triggerClassName="w-full" contentClassName="w-[var(--radix-popover-trigger-width)]" allowClear={true} onClear={() => setSelectedCollaboratorId(null)} disabled={isLoading || collaboratorOptions.length === 0}
                  />
                </div>
            )}
            {/* Combobox Tipo de Atividade */}
            <div className="min-w-[200px] w-full sm:w-auto">
              <Combobox /* ... props ... */
                  id="activity-type-filter" options={activityTypeOptions} selectedValue={selectedActivityType} onSelect={(value) => setSelectedActivityType(value as string | null)} placeholder="Filtrar por tipo" searchPlaceholder="Buscar tipo..." noResultsText="Nenhum tipo encontrado." triggerClassName="w-full" contentClassName="w-[var(--radix-popover-trigger-width)]" allowClear={true} onClear={() => setSelectedActivityType(null)} disabled={isLoading || activityTypeOptions.length === 0}
              />
            </div>
            {/* Botão Filtro de Data */}
            <div className="flex-none w-full sm:w-auto">
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-center sm:w-auto flex gap-2 items-center" disabled={isLoading}>
                    <Filter className="h-4 w-4" /> <span>Filtrar Data</span> {(startPeriod || endPeriod) && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  {/* ... Conteúdo do Popover de Data (sem alterações) ... */}
                  <div className="space-y-4"> <h3 className="font-medium text-center">Filtrar por Período</h3> <div> <Label className="mb-2 block text-sm font-medium text-center">Aplicar filtro sobre:</Label> <RadioGroup value={dateType} onValueChange={(value) => setDateType(value as "startDate" | "endDate")} className="flex justify-center gap-4"> <div className="flex items-center space-x-2"> <RadioGroupItem value="startDate" id="period-start-date" /> <Label htmlFor="period-start-date" className="font-normal cursor-pointer">Data Início</Label> </div> <div className="flex items-center space-x-2"> <RadioGroupItem value="endDate" id="period-end-date" /> <Label htmlFor="period-end-date" className="font-normal cursor-pointer">Data Fim</Label> </div> </RadioGroup> </div> <hr className="my-3"/> <div> <Label htmlFor="start-date-picker-btn" className="mb-1 block text-sm">De:</Label> <Popover> <PopoverTrigger asChild> <Button id="start-date-picker-btn" variant="outline" className={cn("w-full justify-start text-left font-normal", !startPeriod && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {startPeriod ? format(startPeriod, "dd/MM/yyyy") : <span>Selecione a data inicial</span>} </Button> </PopoverTrigger> <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={startPeriod} onSelect={setStartPeriod} initialFocus /></PopoverContent> </Popover> </div> <div> <Label htmlFor="end-date-picker-btn" className="mb-1 block text-sm">Até:</Label> <Popover> <PopoverTrigger asChild> <Button id="end-date-picker-btn" variant="outline" className={cn("w-full justify-start text-left font-normal", !endPeriod && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {endPeriod ? format(endPeriod, "dd/MM/yyyy") : <span>Selecione a data final</span>} </Button> </PopoverTrigger> <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={endPeriod} onSelect={setEndPeriod} initialFocus disabled={startPeriod ? { before: startPeriod } : undefined} /></PopoverContent> </Popover> </div> <div className="flex justify-between pt-3"> <Button variant="ghost" size="sm" onClick={() => { setStartPeriod(undefined); setEndPeriod(undefined); }}>Limpar Datas</Button> <Button size="sm" onClick={() => setIsFilterOpen(false)}>Aplicar</Button> </div> </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Linha 2: Filtros Rápidos de Status */}
          <div className="flex flex-wrap gap-2">
            <Button variant={statusFilters.length === 0 ? "secondary" : "outline"} size="sm" onClick={() => setStatusFilters([])} disabled={isLoading}>Todas</Button>
            <Button variant={isStatusFilterActive("pending") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("pending")} className={!isStatusFilterActive("pending") ? "border-yellow-300 text-yellow-800 hover:bg-yellow-50" : ""} disabled={isLoading}><Clock className="h-4 w-4 mr-1" /> Futuras</Button>
            <Button variant={isStatusFilterActive("in-progress") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("in-progress")} className={!isStatusFilterActive("in-progress") ? "border-blue-300 text-blue-800 hover:bg-blue-50" : ""} disabled={isLoading}><RotateCcw className="h-4 w-4 mr-1" /> Em Progresso</Button>
            <Button variant={isStatusFilterActive("completed") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("completed")} className={!isStatusFilterActive("completed") ? "border-green-300 text-green-800 hover:bg-green-50" : ""} disabled={isLoading}><CheckCircle2 className="h-4 w-4 mr-1" /> Concluídas</Button>
            <Button variant={isStatusFilterActive("cancelled") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("cancelled")} className={!isStatusFilterActive("cancelled") ? "border-red-300 text-red-800 hover:bg-red-50" : ""} disabled={isLoading}><XCircle className="h-4 w-4 mr-1" /> Canceladas</Button>
          </div>

          {/* Linha 3: Badges de Filtros Ativos */}
          {(inputValue || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId || selectedActivityType) && !isLoading && ( // Usa inputValue para mostrar badge de busca
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Filtros ativos:</span>
                {/* Badge de Busca */}
                {inputValue && ( <Badge variant="outline" className="py-1"> <Search className="h-3 w-3 mr-1"/> Busca: {inputValue} </Badge> )}
                {/* ... outros badges ... */}
                {selectedCollaboratorId && collaborators[selectedCollaboratorId] && ( <Badge variant="outline" className="py-1">Colaborador: {collaborators[selectedCollaboratorId].name}</Badge> )}
                {selectedActivityType && ( <Badge variant="outline" className="py-1"> <ListFilter className="h-3 w-3 mr-1" /> Tipo: {selectedActivityType} </Badge> )}
                {statusFilters.length > 0 && ( <Badge variant="outline" className="py-1"> Status: {statusFilters.map(s => ({ pending: 'Futura', 'in-progress': 'Progresso', completed: 'Concluída', cancelled: 'Cancelada' }[s])).join(", ")} </Badge> )}
                {(startPeriod || endPeriod) && ( <Badge variant="outline" className="py-1"> <CalendarIcon className="h-3 w-3 mr-1" /> {dateType === "startDate" ? "Início" : "Fim"}: {startPeriod && ` de ${format(startPeriod, "dd/MM/yy")}`} {endPeriod && ` até ${format(endPeriod, "dd/MM/yy")}`} </Badge> )}
                <Button variant="ghost" size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={resetFilters}>
                  <XCircle className="h-3 w-3 mr-1" /> Limpar todos
                </Button>
              </div>
          )}
        </div>

        {/* Conteúdo Principal: Loading, Lista ou Mensagem Vazia */}
        {isLoading ? (
            // Skeletons
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                  <Card key={index} className="overflow-hidden"> <CardHeader className="pb-3"><Skeleton className="h-5 w-3/5" /><Skeleton className="h-4 w-2/5 mt-1" /></CardHeader> <CardContent className="space-y-2 pb-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></CardContent> <CardFooter className="flex justify-between items-center pt-3"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-24" /></CardFooter> </Card>
              ))}
            </div>
        ) : filteredActivities.length > 0 ? (
            // Lista Paginada + Controles
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedActivities.map((activity) => (
                    // Card da Atividade (sem alterações internas relevantes)
                    <Card key={activity.id} className="overflow-hidden flex flex-col">
                      <CardHeader className="pb-2"> <div className="flex justify-between items-start gap-2"> <div className="flex-1"> <CardTitle className="text-lg flex items-center gap-2 flex-wrap"> <span className="mr-1">{activity.title || "Atividade sem título"}</span> {getPriorityBadge(activity.priority)} </CardTitle> <CardDescription> {getClientName(activity.clientId)} {activity.type && ( <span className="block text-xs mt-1"> Tipo: {activity.type} </span> )} </CardDescription> </div> <div className="flex-shrink-0"> {getStatusBadge(activity.status)} </div> </div> </CardHeader>
                      <CardContent className="flex-grow space-y-3 pb-3"> {activity.description && <p className="text-sm text-muted-foreground line-clamp-3">{activity.description}</p>} <div className="flex items-center text-sm text-muted-foreground"> <Calendar className="h-4 w-4 mr-1.5 flex-shrink-0" /> <span> Início: {activity.startDate ? new Date(activity.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric'}) : 'N/D'} {activity.endDate && ` | Fim: ${new Date(activity.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric'})}`} </span> </div> {user?.role !== 'collaborator' && activity.assignedTo && activity.assignedTo.length > 0 && ( <div className="flex items-start text-sm text-muted-foreground"> <Users className="h-4 w-4 mr-1.5 flex-shrink-0 mt-0.5" /> <span className="line-clamp-2">Responsáveis: {getAssigneeNames(activity.assignedTo)}</span> </div> )} </CardContent>
                      <CardFooter className="flex flex-col gap-3 pt-3 border-t"> <div className="flex justify-end w-full gap-2"> <Button variant="outline" size="sm" onClick={() => navigate(`/activities/${activity.id}`)}>Detalhes</Button> <Button variant="default" size="sm" onClick={() => navigate(`/activities/edit/${activity.id}`)}>Editar</Button> </div> {activity.status !== 'completed' && activity.status !== 'cancelled' && ( <div className="flex justify-between w-full gap-2"> <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 flex-1 justify-center" onClick={() => handleStatusChange(activity.id, 'cancelled')}><XCircle className="h-4 w-4 mr-1" /> Cancelar</Button> {activity.status === 'pending' ? ( <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800 flex-1 justify-center" onClick={() => handleStatusChange(activity.id, 'in-progress')}><RotateCcw className="h-4 w-4 mr-1" /> Iniciar</Button> ) : ( <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 flex-1 justify-center" onClick={() => handleStatusChange(activity.id, 'completed')}><CheckCircle2 className="h-4 w-4 mr-1" /> Concluir</Button> )} </div> )} </CardFooter>
                    </Card>
                ))}
              </div>

              {/* Controles de Paginação */}
              {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-8 mb-4">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}> Anterior </Button>
                    <span className="text-sm text-muted-foreground whitespace-nowrap"> Página {currentPage} de {totalPages} </span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}> Próxima </Button>
                  </div>
              )}
            </>
        ) : (
            // Mensagem Vazia
            <div className="text-center p-10 border rounded-lg bg-card shadow-sm mt-6">
              <h3 className="text-xl font-semibold mb-2">Nenhuma atividade encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {inputValue || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId || selectedActivityType // Verifica se algum filtro está ativo
                    ? "Não encontramos atividades que correspondam aos seus filtros."
                    : "Ainda não há atividades cadastradas ou visíveis para você."}
              </p>
              {/* Botão Limpar Filtros aparece se algum filtro estiver ativo */}
              {inputValue || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId || selectedActivityType ? (
                  <Button onClick={resetFilters} variant="outline" className="mr-2">
                    <RotateCcw className="mr-2 h-4 w-4" /> Limpar Filtros
                  </Button>
              ) : null}
              <Button onClick={() => navigate("/activities/new")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Atividade
              </Button>
            </div>
        )}
      </div>
  );
};

export default ActivitiesPage;