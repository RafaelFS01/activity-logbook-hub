import { useState, useEffect, useMemo } from "react"; // PLANO: Adicionado useMemo
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  // AlertCircle, // Não usado diretamente no código final
  RotateCcw,
  XCircle,
  Filter,
  CalendarIcon,
  FileSpreadsheet
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
import { UserData } from "@/services/firebase/auth"; // Assume que UserData tem pelo menos 'name' e 'role'
import { get, ref } from "firebase/database"; // Removido 'update' pois não é usado aqui
import { db } from "@/lib/firebase";
import {
  getActivities,
  Activity,
  ActivityStatus,
  updateActivityStatus
} from "@/services/firebase/activities";
import { getClients, Client } from "@/services/firebase/clients";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
// import { Checkbox } from "@/components/ui/checkbox"; // Não usado diretamente no código final
import { exportActivitiesToExcel } from "@/utils/exportUtils";
import { Combobox } from "@/components/ui/combobox"; // PLANO: Importar o componente Combobox (verifique o caminho!)

const ActivitiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // user deve ter { uid: string, role: 'admin' | 'manager' | 'collaborator', name?: string, ... }
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
  const [collaborators, setCollaborators] = useState<Record<string, UserData & { uid: string }>>({});

  // PLANO Passo 2: Adicionar Novo Estado para o Filtro
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setActivities([]); // Limpa antes de buscar novos dados
      setFilteredActivities([]);
      setClients({});
      setCollaborators({});

      try {
        // --- Bloco 1: Buscar Atividades ---
        let fetchedActivities: Activity[] = [];
        try {
          fetchedActivities = await getActivities();
        } catch (activityError) {
          console.error('Erro ao buscar atividades:', activityError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar Atividades",
            description: "Não foi possível buscar a lista de atividades."
          });
          // Continua para tentar buscar o resto, mas activities ficará vazio
        }

        // Filtragem inicial baseada no role ANTES de definir o estado principal
        let activitiesToShow = fetchedActivities;
        if (user?.role === 'collaborator' && user?.uid) {
          activitiesToShow = fetchedActivities.filter(activity =>
              activity.assignedTo?.includes(user.uid) // Usar optional chaining
          );
        }
        setActivities(activitiesToShow); // Define o estado principal já pré-filtrado se for colaborador

        // --- Bloco 2: Buscar Clientes ---
        try {
          const fetchedClients = await getClients();
          const clientsMap: Record<string, Client> = {};
          fetchedClients.forEach(client => {
            if (client && client.id) { // Verificação extra
              clientsMap[client.id] = client;
            }
          });
          setClients(clientsMap);
        } catch (clientError) {
          console.error('Erro ao buscar clientes:', clientError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar Clientes",
            description: "Não foi possível buscar os dados dos clientes."
          });
          // Continua, mas clients estará vazio
        }

        // --- PLANO Passo 1: Habilitar e Refinar a Busca de Colaboradores ---
        try {
          const usersRef = ref(db, 'users');
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            const usersData = usersSnapshot.val();
            const collaboratorsMap: Record<string, UserData & { uid: string }> = {};
            Object.entries(usersData).forEach(([uid, userData]) => {
              const typedUserData = userData as UserData; // Faz o cast
              // Adiciona verificação se userData é válido e tem as propriedades esperadas
              if (uid && typedUserData && typeof typedUserData === 'object') {
                collaboratorsMap[uid] = { ...typedUserData, uid };
              }
            });
            setCollaborators(collaboratorsMap);
          } else {
            console.log("Nenhum colaborador encontrado no banco.");
            // setCollaborators({}); // Já inicializado como vazio
          }
        } catch (userError) {
          console.error('Erro ao buscar colaboradores:', userError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar Colaboradores",
            description: "Não foi possível buscar os dados dos colaboradores."
          });
          // setCollaborators({}); // Já inicializado como vazio
        }

      } catch (globalError) {
        // Captura erros não pegos nos blocos try/catch internos (improvável com a estrutura atual)
        console.error("Erro inesperado no fetchData:", globalError);
        toast({
          variant: "destructive",
          title: "Erro Inesperado",
          description: "Ocorreu um erro ao carregar os dados da página."
        });
      } finally {
        setIsLoading(false); // Garante que o loading termine
      }
    };

    // Só executa fetchData se o usuário estiver carregado
    if (user) {
      fetchData();
    } else {
      // Se o usuário ainda não carregou (useAuth pode ser assíncrono),
      // você pode optar por mostrar loading ou uma mensagem.
      // O estado isLoading inicial já cobre isso.
      // Ou limpar os dados se o usuário deslogar
      setActivities([]);
      setFilteredActivities([]);
      setClients({});
      setCollaborators({});
      setIsLoading(false); // Para o loading se não houver usuário
    }

  }, [toast, user]); // Dependência principal é o usuário (para buscar dados e aplicar filtro inicial)

  // PLANO Passo 3: Preparar Dados para o Combobox (usando useMemo)
  const collaboratorOptions = useMemo(() => {
    // Verifica se collaborators não é nulo ou vazio
    if (!collaborators || Object.keys(collaborators).length === 0) return [];
    return Object.values(collaborators)
        // Opcional: Filtrar por status 'ativo' se existir no UserData
        // .filter(collab => collab.active === true)
        .map(collab => ({
          value: collab.uid,
          // Usa o nome, se não existir, usa um fallback com o início do UID
          label: collab.name || `Usuário ${collab.uid.substring(0, 6)}...`,
        }))
        // Ordena por nome (label)
        .sort((a, b) => a.label.localeCompare(b.label));
  }, [collaborators]); // Recalcula apenas quando 'collaborators' mudar

  // PLANO Passo 5: Atualizar Lógica de Filtragem Principal
  useEffect(() => {
    // Começa com as atividades base (já filtradas por role para colaborador no useEffect anterior)
    let filtered = [...activities];

    // 1. Filtro por Status
    if (statusFilters.length > 0) {
      filtered = filtered.filter(activity => statusFilters.includes(activity.status));
    }

    // 2. Filtro por Termo de Busca
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(activity => {
        // Tenta buscar nome do cliente com segurança
        const clientData = activity.clientId ? clients[activity.clientId] : null;
        const clientName = clientData
            ? (clientData.type === 'juridica'
                ? (clientData as any).companyName?.toLowerCase() ?? '' // Nome fantasia
                : clientData.name?.toLowerCase() ?? '') // Nome pessoa física
            : '';

        // Verifica título, descrição e nome do cliente
        return (activity.title?.toLowerCase() ?? '').includes(lowerSearchTerm) ||
            (activity.description?.toLowerCase() ?? '').includes(lowerSearchTerm) ||
            clientName.includes(lowerSearchTerm);
      });
    }

    // 3. Filtro por Período de Data
    if (startPeriod || endPeriod) {
      filtered = filtered.filter(activity => {
        const dateStringToCompare = dateType === "startDate" ? activity.startDate : (activity.endDate || activity.startDate);
        if (!dateStringToCompare) return false; // Ignora se não houver data relevante

        try {
          const activityDate = new Date(dateStringToCompare);
          if (isNaN(activityDate.getTime())) return false; // Data inválida

          // Normaliza para comparar apenas dia/mês/ano
          const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const activityDay = startOfDay(activityDate);
          const startDay = startPeriod ? startOfDay(startPeriod) : null;
          const endDay = endPeriod ? startOfDay(endPeriod) : null;

          if (startDay && endDay) return activityDay >= startDay && activityDay <= endDay;
          if (startDay) return activityDay >= startDay;
          if (endDay) return activityDay <= endDay;

        } catch (e) {
          console.error("Erro ao processar data da atividade para filtro:", dateStringToCompare, e);
          return false; // Ignora atividade com data problemática
        }
        return true; // Não deveria chegar aqui se startPeriod ou endPeriod estiver definido
      });
    }

    // 4. PLANO Passo 5: NOVO FILTRO por Colaborador Selecionado (APENAS para Admin/Manager)
    if (selectedCollaboratorId && user && (user.role === 'admin' || user.role === 'manager')) {
      filtered = filtered.filter(activity =>
          // Verifica se assignedTo existe (é um array) e inclui o ID selecionado
          Array.isArray(activity.assignedTo) && activity.assignedTo.includes(selectedCollaboratorId)
      );
    }

    // 5. Ordenação Final
    filtered.sort((a, b) => {
      const statusPriority: Record<ActivityStatus, number> = {
        'pending': 0, 'in-progress': 1, 'completed': 2, 'cancelled': 3
      };
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Se status for igual, ordena pela data de início (mais recente primeiro)
      try {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
      } catch (e) {
        return 0; // Não quebra se a data for inválida
      }
    });

    setFilteredActivities(filtered);

    // PLANO Passo 5: Adicionar selectedCollaboratorId e user às dependências
    // Incluir também activities, clients, etc., pois a filtragem depende deles.
  }, [
    searchTerm,
    statusFilters,
    dateType,
    startPeriod,
    endPeriod,
    selectedCollaboratorId, // Nova dependência
    user,                  // Nova dependência (para role check no filtro)
    activities,            // Fonte dos dados
    clients,               // Para buscar nome do cliente no filtro
    collaborators          // Necessário para getAssigneeNames (usado no export e potencialmente na UI)
  ]);

  // --- Funções Auxiliares ---

  const getStatusBadge = (status: ActivityStatus) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock className="h-3 w-3 mr-1" /> Futura</Badge>;
      case "in-progress": return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200"><RotateCcw className="h-3 w-3 mr-1" /> Em Progresso</Badge>;
      case "completed": return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluída</Badge>;
      case "cancelled": return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200"><XCircle className="h-3 w-3 mr-1" /> Cancelada</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>; // Fallback
    }
  };

  const getPriorityBadge = (priority: Activity["priority"]) => {
    switch (priority) {
      case "low": return <Badge variant="outline">Baixa</Badge>;
      case "medium": return <Badge variant="secondary">Média</Badge>;
      case "high": return <Badge variant="destructive">Alta</Badge>;
      default: return null; // Ou <Badge variant="outline">N/D</Badge>
    }
  };

  const getClientName = (clientId: string | undefined): string => {
    if (!clientId) return "Cliente não especificado";
    const client = clients[clientId];
    if (!client) return "Cliente não encontrado";
    return client.type === 'juridica'
        ? (client as any).companyName || 'Nome Fantasia Indisponível'
        : client.name || 'Nome Indisponível';
  };

  // Função para obter nomes dos responsáveis (pode ser usada na UI ou Export)
  const getAssigneeNames = (assigneeIds: string[] | undefined): string => {
    if (!assigneeIds || assigneeIds.length === 0) return 'Nenhum responsável';
    // Verifica se collaborators foi carregado
    if (Object.keys(collaborators).length === 0 && isLoading) return 'Carregando...';
    if (Object.keys(collaborators).length === 0 && !isLoading) return 'Responsáveis não carregados';

    return assigneeIds
        .map(id => collaborators[id]?.name || `ID ${id.substring(0,6)}...`) // Usa fallback
        .join(', ');
  };

  const handleStatusChange = async (activityId: string, newStatus: ActivityStatus) => {
    if (!user?.uid) {
      toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado." });
      return;
    }
    if (!activityId) return;

    // Salva o estado atual para possível rollback
    const previousActivities = [...activities];

    // Atualização otimista da UI
    setActivities(prevActivities =>
        prevActivities.map(activity =>
            activity.id === activityId
                ? { ...activity, status: newStatus, updatedAt: new Date().toISOString() }
                : activity
        )
    );

    try {
      await updateActivityStatus(activityId, newStatus, user.uid);
      toast({
        title: "Status atualizado",
        description: `A atividade foi marcada como ${
            { pending: 'futura', 'in-progress': 'em progresso', completed: 'concluída', cancelled: 'cancelada' }[newStatus]
        }.`
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível salvar a alteração de status. Revertendo."
      });
      // Rollback em caso de erro
      setActivities(previousActivities);
    }
  };

  const toggleStatusFilter = (status: ActivityStatus) => {
    setStatusFilters(prev =>
        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const isStatusFilterActive = (status: ActivityStatus) => statusFilters.includes(status);

  // PLANO Passo 6: Atualizar Funcionalidade de Reset
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilters([]);
    setStartPeriod(undefined);
    setEndPeriod(undefined);
    setDateType("startDate");
    setSelectedCollaboratorId(null); // <-- ADICIONADO
    setIsFilterOpen(false); // Fecha o popover de filtros avançados também
  };

  const handleExport = () => {
    if (filteredActivities.length === 0) {
      toast({
        variant: "destructive",
        title: "Sem dados para exportar",
        description: "Não há atividades visíveis com os filtros atuais."
      });
      return;
    }

    try {
      // Prepara os dados para exportação, incluindo nomes
      const activitiesToExport = filteredActivities.map(activity => ({
        ...activity,
        clientName: getClientName(activity.clientId),
        assigneeNames: getAssigneeNames(activity.assignedTo), // Inclui nomes dos responsáveis
        // Formata datas se necessário para o Excel (opcional)
        startDateFormatted: activity.startDate ? format(new Date(activity.startDate), 'dd/MM/yyyy') : '',
        endDateFormatted: activity.endDate ? format(new Date(activity.endDate), 'dd/MM/yyyy') : '',
        // Mapeia status para texto legível (opcional)
        statusText: { pending: 'Futura', 'in-progress': 'Em Progresso', completed: 'Concluída', cancelled: 'Cancelada' }[activity.status] || activity.status,
        // Mapeia prioridade (opcional)
        priorityText: { low: 'Baixa', medium: 'Média', high: 'Alta' }[activity.priority] || activity.priority,
      }));

      // O mapa de assignees pode não ser mais necessário se já incluímos os nomes
      // Mas podemos mantê-lo se a função de exportação o utiliza de alguma forma específica
      const assigneeMap: Record<string, string> = {};
      if (collaborators) {
        Object.entries(collaborators).forEach(([id, collab]) => {
          assigneeMap[id] = collab.name || `Usuário ${id.substring(0,6)}`;
        });
      }

      exportActivitiesToExcel(activitiesToExport, 'atividades_exportadas.xlsx', assigneeMap);

      toast({
        title: "Exportação Iniciada",
        description: `${filteredActivities.length} atividades estão sendo exportadas.`
      });
    } catch (error) {
      console.error('Erro ao exportar atividades:', error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: `Não foi possível exportar as atividades. ${error instanceof Error ? error.message : String(error)}`
      });
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
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Visíveis
            </Button>
            <Button onClick={() => navigate("/activities/new")} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Atividade
            </Button>
          </div>
        </div>

        {/* Barra de Filtros Principal */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center">
            {/* Barra de Busca */}
            {/* REMOVIDO flex-grow, sm:w-auto. ADICIONADO sm:w-4/12 (ou ajuste) */}
            <div className="relative min-w-[200px] w-full sm:w-4/12">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Buscar por título, descrição, cliente..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoading}
              />
            </div>

            {/* PLANO Passo 3 e 4: Combobox de Colaborador (Condicional) */}
            {user && (user.role === 'admin' || user.role === 'manager') && (
                /* REMOVIDO flex-none, sm:w-auto. ADICIONADO sm:w-5/12 (ou ajuste) */
                <div className="min-w-[220px] w-full sm:w-5/12">
                  <Combobox
                      id="collaborator-filter"
                      options={collaboratorOptions}
                      selectedValue={selectedCollaboratorId}
                      onSelect={(value) => setSelectedCollaboratorId(value as string | null)}
                      placeholder="Filtrar por colaborador"
                      searchPlaceholder="Buscar colaborador..."
                      noResultsText="Nenhum colaborador encontrado."
                      triggerClassName="w-full" // Botão interno ocupa container
                      contentClassName="w-[var(--radix-popover-trigger-width)]"
                      allowClear={true}
                      onClear={() => setSelectedCollaboratorId(null)}
                      disabled={isLoading || collaboratorOptions.length === 0}
                  />
                </div>
            )}

            {/* Botão Filtros Avançados (Data) */}
            <div className="flex-none w-full sm:w-auto">
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-center sm:w-auto flex gap-2 items-center" disabled={isLoading}>
                    <Filter className="h-4 w-4" />
                    <span>Filtrar por Data</span>
                    {(startPeriod || endPeriod) && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <h3 className="font-medium text-center">Filtrar por Período</h3>
                    {/* Tipo de Data */}
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-center">Aplicar filtro sobre:</Label>
                      <RadioGroup
                          value={dateType}
                          onValueChange={(value) => setDateType(value as "startDate" | "endDate")}
                          className="flex justify-center gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="startDate" id="period-start-date" />
                          <Label htmlFor="period-start-date" className="font-normal cursor-pointer">Data Início</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="endDate" id="period-end-date" />
                          <Label htmlFor="period-end-date" className="font-normal cursor-pointer">Data Fim</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {/* Separador */}
                    <hr className="my-3"/>
                    {/* Data Início */}
                    <div>
                      <Label htmlFor="start-date-picker-btn" className="mb-1 block text-sm">De:</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button id="start-date-picker-btn" variant="outline"
                                  className={cn("w-full justify-start text-left font-normal", !startPeriod && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startPeriod ? format(startPeriod, "dd/MM/yyyy") : <span>Selecione a data inicial</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={startPeriod} onSelect={setStartPeriod} initialFocus /></PopoverContent>
                      </Popover>
                    </div>
                    {/* Data Fim */}
                    <div>
                      <Label htmlFor="end-date-picker-btn" className="mb-1 block text-sm">Até:</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button id="end-date-picker-btn" variant="outline"
                                  className={cn("w-full justify-start text-left font-normal", !endPeriod && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endPeriod ? format(endPeriod, "dd/MM/yyyy") : <span>Selecione a data final</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={endPeriod} onSelect={setEndPeriod} initialFocus disabled={startPeriod ? { before: startPeriod } : undefined} /></PopoverContent>
                      </Popover>
                    </div>
                    {/* Botões Ação */}
                    <div className="flex justify-between pt-3">
                      <Button variant="ghost" size="sm" onClick={() => { setStartPeriod(undefined); setEndPeriod(undefined); }}>Limpar Datas</Button>
                      <Button size="sm" onClick={() => setIsFilterOpen(false)}>Aplicar</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filtros Rápidos por Status */}
          <div className="flex flex-wrap gap-2">
            <Button variant={statusFilters.length === 0 ? "secondary" : "outline"} size="sm" onClick={() => setStatusFilters([])} disabled={isLoading}>Todas</Button>
            <Button variant={isStatusFilterActive("pending") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("pending")} className={!isStatusFilterActive("pending") ? "border-yellow-300 text-yellow-800 hover:bg-yellow-50" : ""} disabled={isLoading}><Clock className="h-4 w-4 mr-1" /> Futuras</Button>
            <Button variant={isStatusFilterActive("in-progress") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("in-progress")} className={!isStatusFilterActive("in-progress") ? "border-blue-300 text-blue-800 hover:bg-blue-50" : ""} disabled={isLoading}><RotateCcw className="h-4 w-4 mr-1" /> Em Progresso</Button>
            <Button variant={isStatusFilterActive("completed") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("completed")} className={!isStatusFilterActive("completed") ? "border-green-300 text-green-800 hover:bg-green-50" : ""} disabled={isLoading}><CheckCircle2 className="h-4 w-4 mr-1" /> Concluídas</Button>
            <Button variant={isStatusFilterActive("cancelled") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("cancelled")} className={!isStatusFilterActive("cancelled") ? "border-red-300 text-red-800 hover:bg-red-50" : ""} disabled={isLoading}><XCircle className="h-4 w-4 mr-1" /> Canceladas</Button>
          </div>

          {/* Indicadores de Filtros Ativos */}
          {(statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId) && !isLoading && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Filtros ativos:</span>
                {selectedCollaboratorId && collaborators[selectedCollaboratorId] && (
                    <Badge variant="outline" className="py-1">Colaborador: {collaborators[selectedCollaboratorId].name}</Badge>
                )}
                {statusFilters.length > 0 && (
                    <Badge variant="outline" className="py-1">
                      Status: {statusFilters.map(s => ({ pending: 'Futura', 'in-progress': 'Em Progresso', completed: 'Concluída', cancelled: 'Cancelada' }[s])).join(", ")}
                    </Badge>
                )}
                {(startPeriod || endPeriod) && (
                    <Badge variant="outline" className="py-1">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {dateType === "startDate" ? "Início" : "Fim"}:
                      {startPeriod && ` de ${format(startPeriod, "dd/MM/yy")}`}
                      {endPeriod && ` até ${format(endPeriod, "dd/MM/yy")}`}
                    </Badge>
                )}
                <Button variant="ghost" size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={resetFilters}>
                  <XCircle className="h-3 w-3 mr-1" /> Limpar todos
                </Button>
              </div>
          )}
        </div>

        {/* Conteúdo Principal: Loading, Lista de Atividades ou Mensagem de Vazio */}
        {isLoading ? (
            // Esqueleto de Loading
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(6)].map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-3"><Skeleton className="h-5 w-3/5" /><Skeleton className="h-4 w-2/5 mt-1" /></CardHeader>
                    <CardContent className="space-y-2 pb-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></CardContent>
                    <CardFooter className="flex justify-between items-center"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-24" /></CardFooter>
                  </Card>
              ))}
            </div>
        ) : filteredActivities.length > 0 ? (
            // Lista de Atividades Filtradas
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredActivities.map((activity) => (
                  <Card key={activity.id} className="overflow-hidden flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                            <span className="mr-1">{activity.title || "Atividade sem título"}</span>
                            {getPriorityBadge(activity.priority)}
                          </CardTitle>
                          <CardDescription>
                            {getClientName(activity.clientId)}
                          </CardDescription>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(activity.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3 pb-3">
                      {activity.description && <p className="text-sm text-muted-foreground line-clamp-3">{activity.description}</p>}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        <span>
                    Início: {activity.startDate ? new Date(activity.startDate).toLocaleDateString('pt-BR') : 'N/D'}
                          {activity.endDate && ` | Fim: ${new Date(activity.endDate).toLocaleDateString('pt-BR')}`}
                  </span>
                      </div>
                      {/* Opcional: Mostrar responsáveis */}
                      {user?.role !== 'collaborator' && activity.assignedTo && activity.assignedTo.length > 0 && (
                          <div className="flex items-start text-sm text-muted-foreground">
                            <Users className="h-4 w-4 mr-1.5 flex-shrink-0 mt-0.5" /> {/* Use Users icon from lucide-react */}
                            <span className="line-clamp-2">Responsáveis: {getAssigneeNames(activity.assignedTo)}</span>
                          </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pt-3 border-t">
                      {/* Botões Ação Padrão */}
                      <div className="flex justify-end w-full gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/activities/${activity.id}`)}>Detalhes</Button>
                        <Button variant="default" size="sm" onClick={() => navigate(`/activities/edit/${activity.id}`)}>Editar</Button>
                      </div>
                      {/* Botões Ação Status (Condicional) */}
                      {activity.status !== 'completed' && activity.status !== 'cancelled' && (
                          <div className="flex justify-between w-full gap-2">
                            <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 flex-1 justify-center" onClick={() => handleStatusChange(activity.id, 'cancelled')}><XCircle className="h-4 w-4 mr-1" /> Cancelar</Button>
                            {activity.status === 'pending' ? (
                                <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800 flex-1 justify-center" onClick={() => handleStatusChange(activity.id, 'in-progress')}><RotateCcw className="h-4 w-4 mr-1" /> Iniciar</Button>
                            ) : ( // status é 'in-progress'
                                <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 flex-1 justify-center" onClick={() => handleStatusChange(activity.id, 'completed')}><CheckCircle2 className="h-4 w-4 mr-1" /> Concluir</Button>
                            )}
                          </div>
                      )}
                    </CardFooter>
                  </Card>
              ))}
            </div>
        ) : (
            // Mensagem de Nenhuma Atividade Encontrada
            <div className="text-center p-10 border rounded-lg bg-card shadow-sm mt-6">
              <h3 className="text-xl font-semibold mb-2">Nenhuma atividade encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId
                    ? "Não encontramos atividades que correspondam aos seus filtros."
                    : "Ainda não há atividades cadastradas no sistema ou visíveis para você."}
              </p>
              {searchTerm || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId ? (
                  <Button onClick={resetFilters} variant="outline" className="mr-2">
                    <RotateCcw className="mr-2 h-4 w-4" /> Limpar Filtros
                  </Button>
              ) : null}
              <Button onClick={() => navigate("/activities/new")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Nova Atividade
              </Button>
            </div>
        )}
      </div>
  );
};

// Adicione o ícone Users se for usá-lo
import { Users } from "lucide-react";

export default ActivitiesPage;