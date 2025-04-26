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
  Calendar as CalendarIcon, // Renomeado para evitar conflito com o componente Calendar
  FileSpreadsheet,
  ListFilter,
  Users
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar"; // O componente de calendário
import { cn } from "@/lib/utils";
import { UserData } from "@/services/firebase/auth"; // Assume que UserData tem 'uid' opcionalmente ou é adicionado
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
import { Combobox } from "@/components/ui/combobox"; // Assumindo que Combobox está em ui

// --- Constantes ---
const ITEMS_PER_PAGE = 15;
const SEARCH_DEBOUNCE_DELAY = 500; // Delay de 500ms para a busca

const ActivitiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtém user do AuthContext { uid, name, role, email } | null
  const { toast } = useToast();

  // --- Estados ---
  const [activities, setActivities] = useState<Activity[]>([]); // Lista original (filtrada por role na busca inicial)
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]); // Lista após filtros de UI (busca, status, data, etc.)
  const [clients, setClients] = useState<Record<string, Client>>({}); // Mapa de clientes <id, Client>
  const [collaborators, setCollaborators] = useState<Record<string, UserData & { uid: string }>>({}); // Mapa de colaboradores <uid, UserData>
  const [activityTypes, setActivityTypes] = useState<string[]>([]); // Lista de tipos de atividade únicos

  // Estados de Filtro e UI
  const [searchTerm, setSearchTerm] = useState(""); // Termo de busca real (debounced)
  const [inputValue, setInputValue] = useState(""); // Valor imediato do input de busca
  const [statusFilters, setStatusFilters] = useState<ActivityStatus[]>([]); // Filtro de status ativos
  const [dateType, setDateType] = useState<"startDate" | "endDate">("startDate"); // Qual data filtrar (início ou fim)
  const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined); // Data inicial do período
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined); // Data final do período
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null); // Filtro de colaborador (Admin/Manager)
  const [selectedActivityType, setSelectedActivityType] = useState<string | null>(null); // Filtro de tipo de atividade

  // Estados de Controle
  const [isLoading, setIsLoading] = useState(true); // Flag de carregamento
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Popover de filtro de data
  const [currentPage, setCurrentPage] = useState(1); // Página atual da paginação

  // --- UseEffects ---

  // Efeito 1: Busca inicial de dados (atividades, clientes, colaboradores, tipos) e filtragem inicial por role
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setActivities([]);
        setFilteredActivities([]);
        setClients({});
        setCollaborators({});
        setActivityTypes([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      // Resetar estados antes de buscar novos dados
      setActivities([]);
      setFilteredActivities([]);
      setClients({});
      setCollaborators({});
      setActivityTypes([]);
      setCurrentPage(1); // Resetar página ao buscar dados

      // Mapa temporário para colaboradores, necessário para filtrar atividades do manager
      const collaboratorsMap: Record<string, UserData & { uid: string }> = {};

      try {
        // --- 1. Buscar Colaboradores (users) PRIMEIRO ---
        // Essencial ter os roles para a lógica de filtragem do Manager
        try {
          const usersRef = ref(db, 'users');
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            const usersData = usersSnapshot.val();
            Object.entries(usersData).forEach(([uid, userData]) => {
              const typedUserData = userData as UserData;
              // Certifique-se que userData é um objeto válido e tenha as propriedades esperadas
              if (uid && typedUserData && typeof typedUserData === 'object' && typedUserData.role) {
                // Adiciona apenas usuários ativos se necessário (considerar a regra de negócio)
                // if (typedUserData.active !== false) {
                collaboratorsMap[uid] = { ...typedUserData, uid };
                // }
              }
            });
            setCollaborators(collaboratorsMap); // Atualiza o estado global de colaboradores
          }
        } catch (userError) {
          console.error('Erro ao buscar colaboradores:', userError);
          toast({ variant: "destructive", title: "Erro ao carregar Colaboradores", description: "Não foi possível buscar os dados dos colaboradores. A filtragem pode ser afetada." });
          // Continuar mesmo com erro? Ou parar? Decidimos continuar, mas a filtragem do manager pode falhar.
        }

        // --- 2. Buscar Atividades ---
        let fetchedActivities: Activity[] = [];
        try {
          fetchedActivities = await getActivities();
        } catch (activityError) {
          console.error('Erro ao buscar atividades:', activityError);
          toast({ variant: "destructive", title: "Erro ao carregar Atividades", description: "Não foi possível buscar a lista de atividades." });
          // Provavelmente parar aqui se atividades falharem
          setIsLoading(false);
          return;
        }

        // --- 3. Filtragem Inicial por Role (usando collaboratorsMap) ---
        let activitiesToShow: Activity[] = [];
        const currentUserRole = user.role;
        const currentUserId = user.uid;

        if (currentUserRole === 'admin') {
          activitiesToShow = fetchedActivities;
        } else if (currentUserRole === 'manager' && Object.keys(collaboratorsMap).length > 0) {
          // Manager: Vê as suas, de outros managers e de collaborators. NÃO vê as de admins exclusivos.
          activitiesToShow = fetchedActivities.filter(activity => {
            const assignedIds = activity.assignedTo;
            if (!assignedIds || assignedIds.length === 0) return false; // Não mostrar não atribuídas (ajuste se necessário)
            if (assignedIds.includes(currentUserId)) return true; // Vê as suas

            // Verifica se ALGUM dos atribuídos NÃO é admin
            const assignedUsersData = assignedIds.map(id => collaboratorsMap[id]).filter(Boolean);
            const hasNonAdminAssignee = assignedUsersData.some(
                assignee => assignee.role === 'manager' || assignee.role === 'collaborator'
            );
            return hasNonAdminAssignee;
          });
        } else if (currentUserRole === 'collaborator') {
          // Collaborator: Vê apenas as suas
          activitiesToShow = fetchedActivities.filter(activity =>
              activity.assignedTo?.includes(currentUserId)
          );
        } else {
          activitiesToShow = []; // Caso role não reconhecido ou erro nos colaboradores
          console.warn("Role não reconhecido ou dados de colaborador ausentes para filtragem inicial:", user);
        }
        setActivities(activitiesToShow); // Define o estado 'activities' com a lista já filtrada por role


        // --- 4. Buscar Clientes ---
        try {
          const fetchedClients = await getClients();
          const clientsMap: Record<string, Client> = {};
          fetchedClients.forEach(client => { if (client?.id) { clientsMap[client.id] = client; } });
          setClients(clientsMap);
        } catch (clientError) {
          console.error('Erro ao buscar clientes:', clientError);
          toast({ variant: "destructive", title: "Erro ao carregar Clientes", description: "Não foi possível buscar os dados dos clientes." });
        }

        // --- 5. Buscar Tipos de Atividade ---
        try {
          const types = await getActivityTypes();
          setActivityTypes(types);
        } catch (typesError) {
          console.error('Erro ao buscar tipos de atividade:', typesError);
          toast({ variant: "destructive", title: "Erro ao carregar Tipos", description: "Não foi possível buscar os tipos de atividade." });
        }

      } catch (globalError) {
        console.error("Erro inesperado no fetchData:", globalError);
        toast({ variant: "destructive", title: "Erro Inesperado", description: "Ocorreu um erro ao carregar os dados da página." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData(); // Executa a busca ao montar ou quando 'user' muda

    // A dependência principal é 'user'. Se 'toast' mudar, também re-executa.
  }, [user, toast]);


  // Efeito 2: Aplica debounce na busca (observa 'inputValue')
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(inputValue); // Atualiza o termo de busca real (debounced)
    }, SEARCH_DEBOUNCE_DELAY);

    // Limpa o timeout se 'inputValue' mudar antes do delay terminar
    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]); // Depende apenas do valor imediato do input


  // Efeito 3: Filtra e ordena a lista 'activities' sempre que filtros ou a busca (debounced) mudam
  useEffect(() => {
    // Começa com a lista já filtrada por role do useEffect anterior
    let filtered = [...activities];

    // Filtro por Status (multi-seleção)
    if (statusFilters.length > 0) {
      filtered = filtered.filter(activity => statusFilters.includes(activity.status));
    }

    // Filtro por Termo de Busca (usando 'searchTerm' debounced)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(activity => {
        const clientData = activity.clientId ? clients[activity.clientId] : null;
        // Lógica segura para obter nome do cliente
        const clientName = clientData
            ? (clientData.type === 'juridica'
                ? (clientData as any).companyName?.toLowerCase() ?? '' // 'as any' pode ser necessário se tipo não for bem definido
                : clientData.name?.toLowerCase() ?? '')
            : '';
        // Lógica segura para obter nomes dos responsáveis
        const responsibleNames = (activity.assignedTo ?? [])
            .map(id => collaborators[id]?.name?.toLowerCase() ?? '')
            .join(' ');

        // Verifica título, descrição, nome do cliente e nomes dos responsáveis
        return (activity.title?.toLowerCase() ?? '').includes(lowerSearchTerm) ||
            (activity.description?.toLowerCase() ?? '').includes(lowerSearchTerm) ||
            clientName.includes(lowerSearchTerm) ||
            responsibleNames.includes(lowerSearchTerm);
      });
    }

    // Filtro por Período (Data Início ou Fim)
    if (startPeriod || endPeriod) {
      filtered = filtered.filter(activity => {
        const dateStringToCompare = dateType === "startDate" ? activity.startDate : (activity.endDate || activity.startDate); // Usa endDate se existir, senão startDate
        if (!dateStringToCompare) return false; // Ignora se não tiver data
        try {
          const activityDate = new Date(dateStringToCompare);
          if (isNaN(activityDate.getTime())) return false; // Ignora datas inválidas

          // Compara apenas a parte da data (ignora hora)
          const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const activityDay = startOfDay(activityDate);
          const startDay = startPeriod ? startOfDay(startPeriod) : null;
          const endDay = endPeriod ? startOfDay(endPeriod) : null;

          // Lógica de comparação de período
          if (startDay && endDay) return activityDay >= startDay && activityDay <= endDay;
          if (startDay) return activityDay >= startDay;
          if (endDay) return activityDay <= endDay;

        } catch (e) {
          console.error("Erro ao processar data no filtro:", e);
          return false;
        }
        return true; // Caso algo inesperado ocorra, não filtra (ou ajuste para false)
      });
    }

    // Filtro por Colaborador Selecionado (Apenas para Admin/Manager)
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

    // Ordenação Padrão: Status (Pendentes/Progresso primeiro), depois Data de Início (mais recente primeiro)
    filtered.sort((a, b) => {
      const statusPriority: Record<ActivityStatus, number> = { 'pending': 0, 'in-progress': 1, 'completed': 2, 'cancelled': 3 };
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Se status for igual, ordena por data de início (mais recente primeiro)
      try {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        // Tratamento para datas inválidas ou ausentes
        const validDateA = isNaN(dateA) ? 0 : dateA;
        const validDateB = isNaN(dateB) ? 0 : dateB;
        return validDateB - validDateA; // Mais recente primeiro
      } catch (e) {
        // Em caso de erro na conversão de data, não ordena por data
        return 0;
      }
    });

    setFilteredActivities(filtered); // Atualiza o estado com a lista final filtrada e ordenada
    setCurrentPage(1); // Reseta para a primeira página sempre que os filtros mudam

    // Dependências: re-executa quando qualquer um destes mudar
  }, [
    searchTerm, // Busca (debounced)
    statusFilters, // Filtro de status
    dateType, // Tipo de data para filtrar
    startPeriod, // Data inicial
    endPeriod, // Data final
    selectedCollaboratorId, // Colaborador selecionado
    selectedActivityType, // Tipo de atividade selecionado
    user, // Usuário (para filtro de colaborador)
    activities, // Lista base (filtrada por role)
    clients, // Para busca por nome de cliente
    collaborators // Para busca por nome de responsável e filtro de colaborador
  ]);

  // --- Cálculos Memoizados ---

  // Opções para Combobox de Colaborador (ordenadas por nome)
  const collaboratorOptions = useMemo(() => {
    if (!collaborators || Object.keys(collaborators).length === 0) return [];
    return Object.values(collaborators)
        // Poderia adicionar filtro .filter(collab => collab.active) se necessário
        .map(collab => ({
          value: collab.uid,
          label: collab.name || `Usuário ${collab.uid.substring(0, 6)}...`, // Fallback para nome
        }))
        .sort((a, b) => a.label.localeCompare(b.label)); // Ordena alfabeticamente
  }, [collaborators]);

  // Opções para Combobox de Tipo de Atividade (ordenadas)
  const activityTypeOptions = useMemo(() => {
    if (!activityTypes || activityTypes.length === 0) return [];
    return activityTypes.map(type => ({
      value: type,
      label: type
    })).sort((a, b) => a.label.localeCompare(b.label)); // Ordena alfabeticamente
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

  // Efeito para Scroll to top ao mudar de página
  useEffect(() => {
    // Evita scroll inicial desnecessário se a página for 1 e não houver atividades
    if (currentPage > 0 && filteredActivities.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, filteredActivities.length]); // Depende da página e se há atividades

  // --- Funções Auxiliares e Handlers ---

  // Retorna o Badge de Status com ícone e cor
  const getStatusBadge = (status: ActivityStatus) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"><Clock className="h-3 w-3 mr-1" /> Futura</Badge>;
      case "in-progress": return <Badge variant="default" className="border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"><RotateCcw className="h-3 w-3 mr-1" /> Em Progresso</Badge>;
      case "completed": return <Badge variant="outline" className="border-green-300 bg-green-50 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluída</Badge>;
      case "cancelled": return <Badge variant="destructive" className="border-red-300 bg-red-50 text-red-800 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" /> Cancelada</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  // Retorna o Badge de Prioridade
  const getPriorityBadge = (priority: Activity["priority"]) => {
    switch (priority) {
      case "low": return <Badge variant="outline">Baixa</Badge>;
      case "medium": return <Badge variant="secondary">Média</Badge>;
      case "high": return <Badge variant="destructive">Alta</Badge>;
      default: return null; // Não mostra nada se não houver prioridade
    }
  };

  // Retorna o nome formatado do cliente
  const getClientName = (clientId: string | undefined): string => {
    if (!clientId) return "Cliente não especificado";
    const client = clients[clientId];
    if (!client) return "Cliente ID:" + clientId.substring(0, 6) + "..."; // Fallback se cliente não encontrado
    return client.type === 'juridica'
        ? (client as any).companyName || client.name || 'Empresa sem nome' // Prioriza companyName para PJ
        : client.name || 'Cliente sem nome'; // Nome para PF
  };

  // Retorna os nomes dos responsáveis separados por vírgula
  const getAssigneeNames = (assigneeIds: string[] | undefined): string => {
    if (!assigneeIds || assigneeIds.length === 0) return 'Nenhum responsável';
    // Verifica se colaboradores estão carregando ou falharam
    if (isLoading && Object.keys(collaborators).length === 0) return 'Carregando responsáveis...';
    if (!isLoading && Object.keys(collaborators).length === 0) return 'Erro ao carregar responsáveis';

    return assigneeIds
        .map(id => collaborators[id]?.name || `ID ${id.substring(0, 6)}...`) // Usa nome ou fallback com ID
        .join(', '); // Separa por vírgula
  };

  // Lida com a mudança de status de uma atividade (com UI Otimista)
  const handleStatusChange = async (activityId: string, newStatus: ActivityStatus) => {
    if (!user?.uid) {
      toast({ variant: "destructive", title: "Erro de Permissão", description: "Você precisa estar logado para mudar o status." });
      return;
    }
    if (!activityId) return;

    const previousActivities = [...activities]; // Salva estado anterior para rollback

    // 1. Atualização Otimista da UI
    setActivities(prevActivities =>
        prevActivities.map(activity =>
            activity.id === activityId
                ? { ...activity, status: newStatus, updatedAt: new Date().toISOString() } // Atualiza o status localmente
                : activity
        )
    );

    try {
      // 2. Chama a função do Firebase para atualizar no backend
      await updateActivityStatus(activityId, newStatus, user.uid);
      const statusTextMap: Record<ActivityStatus, string> = {
        pending: 'futura', 'in-progress': 'em progresso', completed: 'concluída', cancelled: 'cancelada'
      };
      toast({ title: "Status atualizado", description: `Atividade marcada como ${statusTextMap[newStatus]}.` });
    } catch (error) {
      // 3. Rollback em caso de erro
      console.error('Erro ao atualizar status no Firebase:', error);
      toast({ variant: "destructive", title: "Erro ao atualizar", description: "Não foi possível salvar a alteração de status. Revertendo." });
      setActivities(previousActivities); // Restaura o estado anterior
    }
  };

  // Adiciona ou remove um status do filtro
  const toggleStatusFilter = (status: ActivityStatus) => {
    setStatusFilters(prev =>
        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // Verifica se um filtro de status está ativo
  const isStatusFilterActive = (status: ActivityStatus) => statusFilters.includes(status);

  // Reseta todos os filtros para o estado inicial
  const resetFilters = () => {
    setInputValue(""); // Limpa o campo de input visual
    setSearchTerm(""); // Limpa o termo de busca debounced (dispara useEffect de filtro)
    setStatusFilters([]);
    setStartPeriod(undefined);
    setEndPeriod(undefined);
    setDateType("startDate");
    setSelectedCollaboratorId(null);
    setSelectedActivityType(null);
    setIsFilterOpen(false); // Fecha o popover de data se estiver aberto
    setCurrentPage(1); // Volta para a primeira página
  };

  // Lida com a exportação das atividades visíveis (filtradas) para Excel
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
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Atividades</h1>
          <div className="flex flex-wrap gap-2">
            {/* Botão Exportar */}
            <Button
                variant="outline"
                onClick={handleExport}
                disabled={isLoading || filteredActivities.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Visíveis ({filteredActivities.length})
            </Button>
            {/* Botão Nova Atividade */}
            <Button onClick={() => navigate("/activities/new")} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Atividade
            </Button>
          </div>
        </div>

        {/* Seção de Filtros */}
        <div className="flex flex-col gap-4 mb-6 p-4 border rounded-lg bg-card shadow-sm">
          {/* Linha 1: Busca, Colaborador, Tipo, Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            {/* Input de Busca */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Buscar título, cliente, responsável..."
                  className="pl-8 w-full"
                  value={inputValue} // Controla o valor visual
                  onChange={(e) => setInputValue(e.target.value)} // Atualiza o estado imediato
                  disabled={isLoading}
              />
            </div>
            {/* Combobox Colaborador (Condicional) */}
            {(user?.role === 'admin' || user?.role === 'manager') && (
                <Combobox
                    id="collaborator-filter"
                    options={collaboratorOptions}
                    selectedValue={selectedCollaboratorId}
                    onSelect={(value) => setSelectedCollaboratorId(value as string | null)}
                    placeholder="Filtrar por colaborador"
                    searchPlaceholder="Buscar colaborador..."
                    noResultsText="Nenhum colaborador encontrado."
                    triggerClassName="w-full"
                    contentClassName="w-[var(--radix-popover-trigger-width)]" // Garante que o popover tenha a mesma largura
                    allowClear={true}
                    onClear={() => setSelectedCollaboratorId(null)}
                    disabled={isLoading || collaboratorOptions.length === 0}
                />
            )}
            {/* Combobox Tipo de Atividade */}
            <Combobox
                id="activity-type-filter"
                options={activityTypeOptions}
                selectedValue={selectedActivityType}
                onSelect={(value) => setSelectedActivityType(value as string | null)}
                placeholder="Filtrar por tipo"
                searchPlaceholder="Buscar tipo..."
                noResultsText="Nenhum tipo encontrado."
                triggerClassName="w-full"
                contentClassName="w-[var(--radix-popover-trigger-width)]"
                allowClear={true}
                onClear={() => setSelectedActivityType(null)}
                disabled={isLoading || activityTypeOptions.length === 0}
            />
            {/* Botão Filtro de Data (Popover) */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-center sm:w-auto flex gap-2 items-center" disabled={isLoading}>
                  <Filter className="h-4 w-4" />
                  <span>Filtrar Data</span>
                  {/* Indicador visual se filtro de data está ativo */}
                  {(startPeriod || endPeriod) && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <h3 className="font-medium text-center text-sm">Filtrar por Período</h3>
                  {/* Seleção de Data (Início ou Fim) */}
                  <div>
                    <Label className="mb-2 block text-xs font-medium text-center text-muted-foreground">Aplicar filtro sobre:</Label>
                    <RadioGroup
                        value={dateType}
                        onValueChange={(value) => setDateType(value as "startDate" | "endDate")}
                        className="flex justify-center gap-4"
                    >
                      <div className="flex items-center space-x-2"><RadioGroupItem value="startDate" id="period-start-date" /><Label htmlFor="period-start-date" className="font-normal cursor-pointer text-sm">Data Início</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="endDate" id="period-end-date" /><Label htmlFor="period-end-date" className="font-normal cursor-pointer text-sm">Data Fim</Label></div>
                    </RadioGroup>
                  </div>
                  <hr className="my-3"/>
                  {/* Seleção Data Inicial */}
                  <div>
                    <Label htmlFor="start-date-picker-btn" className="mb-1 block text-sm">De:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button id="start-date-picker-btn" variant="outline" className={cn("w-full justify-start text-left font-normal", !startPeriod && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startPeriod ? format(startPeriod, "dd/MM/yyyy") : <span>Selecione a data inicial</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={startPeriod} onSelect={setStartPeriod} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                  {/* Seleção Data Final */}
                  <div>
                    <Label htmlFor="end-date-picker-btn" className="mb-1 block text-sm">Até:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button id="end-date-picker-btn" variant="outline" className={cn("w-full justify-start text-left font-normal", !endPeriod && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endPeriod ? format(endPeriod, "dd/MM/yyyy") : <span>Selecione a data final</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={endPeriod} onSelect={setEndPeriod} initialFocus disabled={startPeriod ? { before: startPeriod } : undefined} /></PopoverContent>
                    </Popover>
                  </div>
                  {/* Ações do Popover */}
                  <div className="flex justify-between pt-3">
                    <Button variant="ghost" size="sm" onClick={() => { setStartPeriod(undefined); setEndPeriod(undefined); }}>Limpar Datas</Button>
                    <Button size="sm" onClick={() => setIsFilterOpen(false)}>Aplicar</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Linha 2: Filtros Rápidos de Status */}
          <div className="flex flex-wrap gap-2 items-center border-t pt-4 mt-4">
            <span className="text-sm font-medium mr-2">Status:</span>
            {/* Botão 'Todas' */}
            <Button variant={statusFilters.length === 0 ? "secondary" : "outline"} size="sm" onClick={() => setStatusFilters([])} disabled={isLoading}>Todas</Button>
            {/* Botões de Status individuais */}
            <Button variant={isStatusFilterActive("pending") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("pending")} className={!isStatusFilterActive("pending") ? "border-yellow-300 text-yellow-800 hover:bg-yellow-50" : ""} disabled={isLoading}><Clock className="h-4 w-4 mr-1" /> Futuras</Button>
            <Button variant={isStatusFilterActive("in-progress") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("in-progress")} className={!isStatusFilterActive("in-progress") ? "border-blue-300 text-blue-800 hover:bg-blue-50" : ""} disabled={isLoading}><RotateCcw className="h-4 w-4 mr-1" /> Em Progresso</Button>
            <Button variant={isStatusFilterActive("completed") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("completed")} className={!isStatusFilterActive("completed") ? "border-green-300 text-green-800 hover:bg-green-50" : ""} disabled={isLoading}><CheckCircle2 className="h-4 w-4 mr-1" /> Concluídas</Button>
            <Button variant={isStatusFilterActive("cancelled") ? "secondary" : "outline"} size="sm" onClick={() => toggleStatusFilter("cancelled")} className={!isStatusFilterActive("cancelled") ? "border-red-300 text-red-800 hover:bg-red-50" : ""} disabled={isLoading}><XCircle className="h-4 w-4 mr-1" /> Canceladas</Button>
          </div>

          {/* Linha 3: Badges de Filtros Ativos e Botão Limpar */}
          {(inputValue || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId || selectedActivityType) && !isLoading && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground border-t pt-3 mt-3">
                <span className="font-medium">Filtros ativos:</span>
                {/* Badge de Busca */}
                {inputValue && ( <Badge variant="secondary" className="py-1"> <Search className="h-3 w-3 mr-1"/> Busca: "{inputValue}" </Badge> )}
                {/* Badge de Colaborador */}
                {selectedCollaboratorId && collaborators[selectedCollaboratorId] && ( <Badge variant="secondary" className="py-1"><Users className="h-3 w-3 mr-1" /> Colab.: {collaborators[selectedCollaboratorId].name}</Badge> )}
                {/* Badge de Tipo */}
                {selectedActivityType && ( <Badge variant="secondary" className="py-1"> <ListFilter className="h-3 w-3 mr-1" /> Tipo: {selectedActivityType} </Badge> )}
                {/* Badge de Status */}
                {statusFilters.length > 0 && ( <Badge variant="secondary" className="py-1"> Status: {statusFilters.map(s => ({ pending: 'Futura', 'in-progress': 'Progresso', completed: 'Concluída', cancelled: 'Cancelada' }[s])).join(", ")} </Badge> )}
                {/* Badge de Data */}
                {(startPeriod || endPeriod) && ( <Badge variant="secondary" className="py-1"> <CalendarIcon className="h-3 w-3 mr-1" /> {dateType === "startDate" ? "Início" : "Fim"}: {startPeriod && ` de ${format(startPeriod, "dd/MM/yy")}`} {endPeriod && ` até ${format(endPeriod, "dd/MM/yy")}`} </Badge> )}
                {/* Botão Limpar Todos */}
                <Button variant="ghost" size="sm" className="h-auto px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 ml-auto" onClick={resetFilters}>
                  <XCircle className="h-3 w-3 mr-1" /> Limpar todos
                </Button>
              </div>
          )}
        </div>

        {/* Conteúdo Principal: Loading, Lista ou Mensagem Vazia */}
        {isLoading ? (
            // Estado de Carregamento (Skeletons)
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <Skeleton className="h-5 w-3/5 mb-1" />
                      <Skeleton className="h-4 w-2/5" />
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                    <CardFooter className="flex justify-end items-center pt-3 gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </CardFooter>
                  </Card>
              ))}
            </div>
        ) : filteredActivities.length > 0 ? (
            // Lista de Atividades Paginada + Controles de Paginação
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedActivities.map((activity) => (
                    // Card da Atividade
                    <Card key={activity.id} className="overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200">
                      <CardHeader className="pb-2 bg-card">
                        <div className="flex justify-between items-start gap-2">
                          {/* Título e Cliente */}
                          <div className="flex-1 overflow-hidden mr-2">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 flex-wrap">
                              <span className="truncate mr-1" title={activity.title || "Atividade sem título"}>{activity.title || "Atividade sem título"}</span>
                              {getPriorityBadge(activity.priority)}
                            </CardTitle>
                            <CardDescription className="text-xs truncate" title={getClientName(activity.clientId)}>
                              {getClientName(activity.clientId)}
                            </CardDescription>
                            {/* Tipo da Atividade */}
                            {activity.type && (
                                <Badge variant="outline" className="mt-1 text-xs px-1.5 py-0.5">{activity.type}</Badge>
                            )}
                          </div>
                          {/* Badge de Status */}
                          <div className="flex-shrink-0">
                            {getStatusBadge(activity.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-2 py-3 px-4">
                        {/* Descrição */}
                        {activity.description && <p className="text-sm text-muted-foreground line-clamp-3">{activity.description}</p>}
                        {/* Datas */}
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          <span>
                             Início: {activity.startDate ? new Date(activity.startDate).toLocaleDateString('pt-BR') : 'N/D'}
                            {activity.endDate && ` | Fim: ${new Date(activity.endDate).toLocaleDateString('pt-BR')}`}
                          </span>
                        </div>
                        {/* Responsáveis (Condicional para não mostrar a colaboradores se for regra) */}
                        {/* {user?.role !== 'collaborator' && activity.assignedTo && activity.assignedTo.length > 0 && ( */}
                        {activity.assignedTo && activity.assignedTo.length > 0 && ( // Mostrando para todos por enquanto
                            <div className="flex items-start text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">Resp.: {getAssigneeNames(activity.assignedTo)}</span>
                            </div>
                        )}
                      </CardContent>
                      {/* Ações no Rodapé */}
                      <CardFooter className="flex flex-col gap-2 pt-2 pb-3 px-4 border-t bg-muted/30">
                        {/* Botões Detalhes e Editar */}
                        <div className="flex justify-end w-full gap-2">
                          <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs" onClick={() => navigate(`/activities/${activity.id}`)}>Detalhes</Button>
                          <Button variant="default" size="sm" className="h-7 px-2 py-1 text-xs" onClick={() => navigate(`/activities/edit/${activity.id}`)}>Editar</Button>
                        </div>
                        {/* Botões de Ação Rápida de Status (Condicional) */}
                        {activity.status !== 'completed' && activity.status !== 'cancelled' && (
                            <div className="flex justify-between w-full gap-2">
                              {/* Botão Cancelar (Permitido para criador ou admin) */}
                              {(user?.role === 'admin' || activity.createdBy === user?.uid) && (
                                  <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 flex-1 justify-center" onClick={() => handleStatusChange(activity.id, 'cancelled')}>
                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                                  </Button>
                              )}
                              {/* Botão Iniciar / Concluir */}
                              {activity.status === 'pending' ? (
                                  <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800 flex-1 justify-center" onClick={() => handleStatusChange(activity.id, 'in-progress')}>
                                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Iniciar
                                  </Button>
                              ) : activity.status === 'in-progress' ? (
                                  <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 flex-1 justify-center" onClick={() => handleStatusChange(activity.id, 'completed')}>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                                  </Button>
                              ) : null}
                            </div>
                        )}
                      </CardFooter>
                    </Card>
                ))}
              </div>

              {/* Controles de Paginação */}
              {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-8 mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
              )}
            </>
        ) : (
            // Estado Vazio
            <div className="text-center p-10 border rounded-lg bg-card shadow-sm mt-6">
              <h3 className="text-xl font-semibold mb-2">Nenhuma atividade encontrada</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {/* Mensagem diferente se filtros estiverem ativos */}
                {inputValue || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId || selectedActivityType
                    ? "Não encontramos atividades que correspondam aos seus filtros. Tente ajustá-los ou limpá-los."
                    : "Ainda não há atividades cadastradas ou visíveis para você nesta seção."}
              </p>
              {/* Botão Limpar Filtros (Condicional) */}
              {inputValue || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId || selectedActivityType ? (
                  <Button onClick={resetFilters} variant="outline" className="mr-2">
                    <RotateCcw className="mr-2 h-4 w-4" /> Limpar Filtros
                  </Button>
              ) : null}
              {/* Botão Criar Nova Atividade */}
              <Button onClick={() => navigate("/activities/new")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Atividade
              </Button>
            </div>
        )}
      </div>
  );
};

export default ActivitiesPage;