import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserData, UserData } from "@/services/firebase/auth";
import { Button } from "@/components/ui/button";
// Importar ChevronDown/Up de lucide-react
import { Edit, Mail, Phone, Calendar as CalendarIconLucide, List, Search, Filter, RotateCcw, FileSpreadsheet, Clock, CheckCircle2, XCircle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { update, ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, ActivityStatus, getActivities } from "@/services/firebase/activities";
import { Client, PessoaJuridicaClient, PessoaFisicaClient, getClients } from "@/services/firebase/clients";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { exportActivitiesToExcel } from "@/utils/exportUtils"; // Ajuste o caminho se necessário

// Helper function para formatar data localmente se precisar
const formatDateLocal = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch (e) {
    return '-';
  }
};

// Helper para texto de Role (pode vir do utils também)
const getRoleText = (role?: string): string => {
  if (!role) return 'N/A';
  switch (role) {
    case 'admin': return 'Administrador';
    case 'manager': return 'Gerente';
    case 'collaborator': return 'Colaborador';
    default: return role;
  }
};

// Interface para atividade enriquecida com nome do cliente (usada na exportação)
interface ActivityWithClientName extends Activity {
  clientName?: string;
}

const CollaboratorDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: loggedInUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para Atividades e Filtros
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<ActivityStatus[]>([]);
  const [dateType, setDateType] = useState<"startDate" | "endDate">("startDate");
  const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined);
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined);
  const [collaborators, setCollaborators] = useState<Record<string, UserData & { uid: string }>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});

  // Estado para controlar visibilidade dos filtros avançados
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);


  // --- Fetch Data Effect ---
  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) {
        console.error("ID do colaborador não encontrado na URL");
        toast({ variant: "destructive", title: "Erro", description: "ID do colaborador inválido." });
        navigate("/collaborators");
        return;
      }
      setIsLoading(true);
      try {
        // --- 1. Buscar Dados do Colaborador ---
        const user = await getUserData(id);
        if (user) {
          setUserData(user);
        } else {
          toast({ variant: "destructive", title: "Erro", description: "Colaborador não encontrado." });
          navigate("/collaborators");
          setIsLoading(false);
          return;
        }

        // --- 2. Buscar Atividades, Colaboradores e Clientes ---
        const [allActivities, usersSnapshot, allClients] = await Promise.all([
          getActivities().catch(err => {
            console.error("Erro ao buscar atividades:", err);
            toast({ variant: "warning", title: "Aviso", description: "Não foi possível carregar as atividades." });
            return [];
          }),
          get(ref(db, 'users')).catch(err => {
            console.error("Erro ao buscar lista de colaboradores:", err);
            toast({ variant: "warning", title: "Aviso", description: "Não foi possível carregar a lista completa de colaboradores para exportação." });
            return null;
          }),
          getClients().catch(err => {
            console.error("Erro ao buscar clientes:", err);
            toast({ variant: "warning", title: "Aviso", description: "Não foi possível carregar os nomes dos clientes." });
            return [];
          })
        ]);

        // --- Processar Atividades ---
        const collaboratorActivities = allActivities.filter(activity =>
            activity.assignedTo && activity.assignedTo.includes(id)
        );
        setActivities(collaboratorActivities);

        // --- Processar Colaboradores ---
        if (usersSnapshot?.exists()) {
          const usersData = usersSnapshot.val();
          const collaboratorsMapResult: Record<string, UserData & { uid: string }> = {};
          Object.entries(usersData).forEach(([uid, userData]) => {
            collaboratorsMapResult[uid] = { ...(userData as UserData), uid };
          });
          setCollaborators(collaboratorsMapResult);
        } else {
          setCollaborators({});
        }

        // --- Processar Clientes ---
        const clientNameMapResult: Record<string, string> = {};
        allClients.forEach(client => {
          if (!client?.id) return;
          const name = client.type === 'juridica'
              ? (client as PessoaJuridicaClient).companyName
              : (client as PessoaFisicaClient).name;
          clientNameMapResult[client.id] = name || `Cliente ${client.id}`;
        });
        setClientsMap(clientNameMapResult);

      } catch (error) {
        console.error("Erro geral ao buscar dados:", error);
        toast({ variant: "destructive", title: "Erro Crítico", description: "Não foi possível carregar todos os dados da página." });
        setUserData(null);
        setActivities([]);
        setCollaborators({});
        setClientsMap({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  // --- Filter Effect ---
  useEffect(() => {
    let filtered = [...activities];

    // Filtro por Termo de Busca
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
          activity.title.toLowerCase().includes(lowerSearchTerm) ||
          activity.description.toLowerCase().includes(lowerSearchTerm) ||
          (clientsMap[activity.clientId] || '').toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Filtro por Status
    if (statusFilters.length > 0) {
      filtered = filtered.filter(activity => statusFilters.includes(activity.status));
    }

    // Filtro por Período de Data
    if (startPeriod || endPeriod) {
      filtered = filtered.filter(activity => {
        const dateStrToCompare = dateType === "startDate" ? activity.startDate : activity.endDate;
        if (!dateStrToCompare) return false;

        try {
          const activityDateUTC = new Date(dateStrToCompare);
          if (isNaN(activityDateUTC.getTime())) return false;
          activityDateUTC.setUTCHours(0, 0, 0, 0);

          const startFilterDateUTC = startPeriod ? new Date(Date.UTC(startPeriod.getFullYear(), startPeriod.getMonth(), startPeriod.getDate())) : null;
          const endFilterDateUTC = endPeriod ? new Date(Date.UTC(endPeriod.getFullYear(), endPeriod.getMonth(), endPeriod.getDate())) : null;

          const afterStart = startFilterDateUTC ? activityDateUTC >= startFilterDateUTC : true;
          const beforeEnd = endFilterDateUTC ? activityDateUTC <= endFilterDateUTC : true;

          return afterStart && beforeEnd;
        } catch (e) {
          console.error("Error parsing date for filter:", dateStrToCompare, e);
          return false;
        }
      });
    }

    // Ordenar
    filtered.sort((a, b) => {
      try {
        const dateA = new Date(a.startDate || 0).getTime();
        const dateB = new Date(b.startDate || 0).getTime();
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
      } catch {
        return 0;
      }
    });

    setFilteredActivities(filtered);
  }, [activities, searchTerm, statusFilters, dateType, startPeriod, endPeriod, clientsMap]);


  // --- Dados Formatados para Exibição ---
  const formattedUserData = userData ? {
    CPF: userData.cpf || '-',
    Telefone: userData.phone || '-',
    "Data de Nascimento": formatDateLocal(userData.birthDate),
    "Data de Admissão": formatDateLocal(userData.admissionDate),
  } : {};

  // --- Ações ---
  const handleDeleteCollaborator = async () => {
    if (!id || !userData) return;
    setIsDeleting(true);
    try {
      await update(ref(db, `users/${id}`), { active: false });
      setUserData(prev => prev ? { ...prev, active: false } : null);
      toast({ title: "Colaborador desativado", description: `"${userData.name}" foi desativado com sucesso.` });
    } catch (error) {
      console.error("Erro ao desativar colaborador:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível desativar o colaborador." });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStatusFilter = (status: ActivityStatus) => {
    setStatusFilters(prev =>
        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilters([]);
    setStartPeriod(undefined);
    setEndPeriod(undefined);
    setDateType("startDate");
    // Opcional: Fechar filtros avançados ao limpar
    // setIsAdvancedFilterOpen(false);
  };

  const handleExport = () => {
    if (filteredActivities.length === 0) {
      toast({ variant: "destructive", title: "Sem dados para exportar", description: "Não há atividades para exportar com os filtros atuais." });
      return;
    }
    if (!userData) {
      toast({ variant: "destructive", title: "Erro", description: "Dados do colaborador não carregados." });
      return;
    }

    try {
      const assigneeMap: Record<string, string> = {};
      Object.entries(collaborators).forEach(([uid, user]) => {
        if (user?.name) {
          assigneeMap[uid] = user.name;
        }
      });

      const activitiesToExport: ActivityWithClientName[] = filteredActivities.map(activity => ({
        ...activity,
        clientName: clientsMap[activity.clientId] || activity.clientId || 'Cliente não identificado'
      }));

      const filename = `atividades_${userData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${format(new Date(), 'yyyyMMdd')}.xlsx`;

      exportActivitiesToExcel(
          activitiesToExport,
          filename,
          assigneeMap
      );

      toast({ title: "Exportação Iniciada", description: `${activitiesToExport.length} atividades estão sendo exportadas.` });
    } catch (error) {
      console.error('Erro ao exportar atividades:', error);
      toast({ variant: "destructive", title: "Erro na exportação", description: "Não foi possível gerar o arquivo Excel." });
    }
  };

  // --- Funções Auxiliares de UI ---
  const getActivityStatusText = (status: ActivityStatus): string => {
    switch (status) {
      case 'pending': return 'Futura';
      case 'in-progress': return 'Em Progresso';
      case 'completed': return 'Concluída';
      case 'cancelled': return 'Cancelada';
      default: return status || 'N/A';
    }
  };

  const getActivityStatusClass = (status: ActivityStatus) => {
    switch (status) {
        // Usando cores semanticamente mais adaptáveis ou com variantes dark explícitas se necessário
      case 'completed': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50';
      case 'pending': default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50';
    }
  };

  // --- Renderização ---
  return (
      <div className="container mx-auto py-6 px-4 md:px-6 max-w-6xl">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Detalhes do Colaborador</h1>
          <Button onClick={() => navigate("/collaborators")} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para a lista
          </Button>
        </div>

        {isLoading ? (
            // --- Skeleton ---
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-32 ml-auto" />
              </CardFooter>
            </Card>
        ) : !userData ? (
            // --- User Not Found ---
            <Card className="text-center p-10 border border-dashed rounded-lg bg-muted/30">
              <CardHeader>
                <CardTitle className="text-xl text-destructive">Colaborador não encontrado</CardTitle>
                <CardDescription>O ID solicitado não corresponde a um colaborador válido ou ocorreu um erro ao buscar os dados.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => navigate("/collaborators")} variant="default" size="sm" className="mx-auto">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para a lista
                </Button>
              </CardFooter>
            </Card>
        ) : (
            // --- Main Content ---
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4 border-b border-border"> {/* Use semantic border */}
                <div className="flex flex-wrap justify-between items-start gap-x-4 gap-y-2">
                  <div>
                    <CardTitle className="text-2xl font-semibold">{userData.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-sm text-muted-foreground"> {/* Use semantic text */}
                      <Mail className="h-3 w-3"/> {userData.email || 'Email não informado'}
                    </CardDescription>
                    <CardDescription className="flex items-center gap-1 text-sm text-muted-foreground mt-1"> {/* Use semantic text */}
                      <Phone className="h-3 w-3"/> {userData.phone || 'Telefone não informado'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-sm capitalize">
                    {getRoleText(userData.role)}
                  </Badge>
                </div>
              </CardHeader>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border"> {/* Use semantic border */}
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="activities">Atividades ({filteredActivities.length})</TabsTrigger>
                </TabsList>

                {/* --- Tab: Informações --- */}
                <TabsContent value="info" className="p-0">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {/* Status */}
                      <div className="flex items-center justify-between py-2 border-b border-border"> {/* Use semantic border */}
                        <div className="font-medium text-muted-foreground text-sm">Status</div>
                        <div>
                          {userData.active ? (
                              <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50 dark:border-green-500 dark:text-green-400 dark:bg-green-900/30">Ativo</Badge>
                          ) : (
                              <Badge variant="destructive" className="border-red-600 text-red-700 bg-red-50 dark:border-red-500 dark:text-red-400 dark:bg-red-900/30">Inativo</Badge>
                          )}
                        </div>
                      </div>
                      {/* Outros Dados */}
                      {Object.entries(formattedUserData).map(([field, value]) => (
                          <div key={field} className="flex items-center justify-between py-2 border-b border-border last:border-b-0"> {/* Use semantic border */}
                            <div className="font-medium text-muted-foreground text-sm">{field}</div>
                            <div className="text-sm">{value}</div>
                          </div>
                      ))}
                    </div>
                  </CardContent>
                </TabsContent>

                {/* --- Tab: Atividades --- */}
                <TabsContent value="activities" className="p-0 m-0">
                  {/* Área de Filtros - MELHORADA PARA DARK MODE */}
                  <div className="bg-muted/50 p-4 md:p-6 border-b border-border"> {/* Use semantic background e border */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Busca */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search" placeholder="Buscar por título, descrição ou cliente..."
                            className="pl-9" // Input já deve ter estilo dark mode do Shadcn
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      {/* Botão Exportar */}
                      <div className="flex justify-start md:justify-end">
                        <Button
                            size="sm"
                            variant="outline" // Outline já deve ter estilo dark mode do Shadcn
                            onClick={handleExport}
                            disabled={filteredActivities.length === 0}
                            className="w-full md:w-auto"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Exportar Atividades Filtradas
                        </Button>
                      </div>
                    </div>

                    {/* Botão para mostrar/esconder filtros avançados - MELHORADO PARA DARK MODE */}
                    <button
                        onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                        // Usando cores semânticas que se adaptam ao tema claro/escuro
                        className="flex w-full justify-between rounded-lg bg-muted px-4 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/80 focus:outline-none focus-visible:ring focus-visible:ring-ring focus-visible:ring-opacity-75 mb-3"
                    >
                      <span><Filter className="inline h-4 w-4 mr-1"/> Filtros Avançados</span>
                      {isAdvancedFilterOpen ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" /> // Ícone com cor semântica
                      ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" /> // Ícone com cor semântica
                      )}
                    </button>

                    {/* Painel de Filtros Avançados - MELHORADO PARA DARK MODE */}
                    {isAdvancedFilterOpen && (
                        // Usando cores semânticas para texto e borda
                        <div className="px-2 pb-2 text-sm text-muted-foreground space-y-4 border-t border-border pt-4">
                          {/* Status */}
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Status</Label>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                              {/* Checkbox e Label já devem ter estilo dark mode do Shadcn, ajustando cores dos ícones */}
                              <div className="flex items-center gap-2">
                                <Checkbox id="status-pending" checked={statusFilters.includes("pending")} onCheckedChange={() => toggleStatusFilter("pending")}/>
                                <Label htmlFor="status-pending" className="flex items-center cursor-pointer text-sm">
                                  <Clock className="h-3 w-3 mr-1 text-yellow-600 dark:text-yellow-400" /> Pendentes {/* Cor ajustada para dark */}
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id="status-in-progress" checked={statusFilters.includes("in-progress")} onCheckedChange={() => toggleStatusFilter("in-progress")}/>
                                <Label htmlFor="status-in-progress" className="flex items-center cursor-pointer text-sm">
                                  <RotateCcw className="h-3 w-3 mr-1 text-blue-600 dark:text-blue-400" /> Em Progresso {/* Cor ajustada para dark */}
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id="status-completed" checked={statusFilters.includes("completed")} onCheckedChange={() => toggleStatusFilter("completed")}/>
                                <Label htmlFor="status-completed" className="flex items-center cursor-pointer text-sm">
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" /> Concluídas {/* Cor ajustada para dark */}
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id="status-cancelled" checked={statusFilters.includes("cancelled")} onCheckedChange={() => toggleStatusFilter("cancelled")}/>
                                <Label htmlFor="status-cancelled" className="flex items-center cursor-pointer text-sm">
                                  <XCircle className="h-3 w-3 mr-1 text-red-600 dark:text-red-400" /> Canceladas {/* Cor ajustada para dark */}
                                </Label>
                              </div>
                            </div>
                          </div>
                          {/* Datas */}
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Período</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                              {/* Radio Group Tipo Data - Shadcn deve lidar com dark mode */}
                              <div>
                                <Label className="mb-1 block text-sm font-medium">Filtrar por</Label>
                                <RadioGroup value={dateType} onValueChange={(value) => setDateType(value as "startDate" | "endDate")} className="flex space-x-4">
                                  <div className="flex items-center space-x-2"><RadioGroupItem value="startDate" id="collab-start-date" /><Label htmlFor="collab-start-date" className="text-sm font-normal">Início</Label></div>
                                  <div className="flex items-center space-x-2"><RadioGroupItem value="endDate" id="collab-end-date" /><Label htmlFor="collab-end-date" className="text-sm font-normal">Fim</Label></div>
                                </RadioGroup>
                              </div>
                              {/* Popover Data Início - Shadcn deve lidar com dark mode */}
                              <div>
                                <Label htmlFor="collab-period-start" className="mb-1 block text-sm font-medium">De</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button id="collab-period-start" variant="outline" className={cn("w-full justify-start text-left font-normal", !startPeriod && "text-muted-foreground")}>
                                      <CalendarIconLucide className="mr-2 h-4 w-4" />
                                      {startPeriod ? format(startPeriod, "dd/MM/yyyy") : <span>Selecione</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startPeriod} onSelect={setStartPeriod} initialFocus locale={ptBR} /></PopoverContent>
                                </Popover>
                              </div>
                              {/* Popover Data Fim - Shadcn deve lidar com dark mode */}
                              <div>
                                <Label htmlFor="collab-period-end" className="mb-1 block text-sm font-medium">Até</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button id="collab-period-end" variant="outline" className={cn("w-full justify-start text-left font-normal", !endPeriod && "text-muted-foreground")}>
                                      <CalendarIconLucide className="mr-2 h-4 w-4" />
                                      {endPeriod ? format(endPeriod, "dd/MM/yyyy") : <span>Selecione</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endPeriod} onSelect={setEndPeriod} disabled={(date) => startPeriod && date < startPeriod} initialFocus locale={ptBR} /></PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                          {/* Limpar Filtros - Cor ajustada para dark */}
                          <div className="flex justify-end pt-2">
                            <Button variant="link" size="sm" onClick={resetFilters} className="text-blue-600 dark:text-blue-400 hover:underline h-auto p-0 text-xs">Limpar Filtros Avançados</Button>
                          </div>
                        </div>
                    )}

                  </div> {/* Fim da área de filtros */}

                  {/* Lista de Atividades ou Estado Vazio */}
                  <CardContent className="p-4 md:p-6">
                    {filteredActivities.length > 0 ? (
                        <div className="space-y-4">
                          {filteredActivities.map((activity) => (
                              <Card key={activity.id} className="overflow-hidden border border-border hover:shadow-md transition-shadow duration-200 dark:border-border"> {/* Use semantic border */}
                                <CardHeader className="p-4">
                                  <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-base font-medium leading-tight">{activity.title}</CardTitle>
                                    {/* Badge com classes de status atualizadas para dark mode */}
                                    <Badge className={cn("text-xs whitespace-nowrap px-2 py-0.5", getActivityStatusClass(activity.status))}>
                                      {getActivityStatusText(activity.status)}
                                    </Badge>
                                  </div>
                                  <CardDescription className="text-xs text-muted-foreground mt-1"> {/* Use semantic text */}
                                    Cliente: {clientsMap[activity.clientId] || 'Não vinculado'}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{activity.description || 'Sem descrição.'}</p>
                                  <div className="flex items-center text-xs text-muted-foreground flex-wrap gap-x-2 gap-y-1"> {/* Use semantic text */}
                                    <div className="flex items-center">
                                      <CalendarIconLucide className="h-3 w-3 mr-1" />
                                      <span>Início: {formatDateLocal(activity.startDate)}</span>
                                    </div>
                                    {activity.endDate && (
                                        <div className="flex items-center">
                                          <span className="hidden sm:inline mx-1">•</span>
                                          <CalendarIconLucide className="h-3 w-3 mr-1" />
                                          <span>Fim: {formatDateLocal(activity.endDate)}</span>
                                        </div>
                                    )}
                                    {activity.completedDate && (
                                        <div className="flex items-center text-green-600 dark:text-green-400"> {/* Cor ajustada para dark */}
                                          <span className="hidden sm:inline mx-1">•</span>
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          <span>Concluída: {formatDateLocal(activity.completedDate)}</span>
                                        </div>
                                    )}
                                  </div>
                                </CardContent>
                                <CardFooter className="p-2 bg-muted/50 flex justify-end"> {/* Use semantic background */}
                                  <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs" onClick={() => navigate(`/activities/${activity.id}`)}>
                                    Ver detalhes
                                  </Button>
                                </CardFooter>
                              </Card>
                          ))}
                        </div>
                    ) : (
                        // Estado Vazio
                        <div className="text-center py-10 px-6 border border-dashed border-border rounded-lg bg-muted/30"> {/* Use semantic border/background */}
                          <List className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /> {/* Use semantic text */}
                          <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
                          <p className="text-muted-foreground mb-4 text-sm max-w-md mx-auto"> {/* Use semantic text */}
                            {searchTerm || statusFilters.length > 0 || startPeriod || endPeriod ?
                                "Não foram encontradas atividades com os filtros aplicados para este colaborador." :
                                "Este colaborador ainda não possui atividades atribuídas."}
                          </p>
                          {(searchTerm || statusFilters.length > 0 || startPeriod || endPeriod) && (
                              <Button variant="outline" size="sm" onClick={resetFilters}>Limpar todos os filtros</Button> // Shadcn deve lidar com dark mode
                          )}
                        </div>
                    )}
                  </CardContent>
                </TabsContent>
              </Tabs>

              {/* Footer com Ações */}
              <CardFooter className="flex justify-end gap-2 p-4 border-t border-border bg-muted/20"> {/* Use semantic border/background */}
                <Button
                    variant="outline" // Shadcn deve lidar com dark mode
                    size="sm"
                    onClick={() => { if (id) navigate(`/collaborators/edit/${id}`); }}
                    disabled={!userData.active}
                >
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                {loggedInUser?.role === 'admin' && userData.active && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"> {/* Shadcn deve lidar com dark mode */}
                          <XCircle className="h-4 w-4 mr-2" /> Desativar Colaborador
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent> {/* Shadcn deve lidar com dark mode */}
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar desativação</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja desativar o colaborador "{userData.name}"? Ele será marcado como inativo e pode perder acesso a algumas funcionalidades.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel> {/* Shadcn deve lidar com dark mode */}
                          <AlertDialogAction
                              onClick={handleDeleteCollaborator}
                              disabled={isDeleting}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90" // Destructive já deve ter estilo dark mode
                          >
                            {isDeleting ? "Desativando..." : "Confirmar Desativação"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                )}
                {/* Botão Reativar (Opcional) */}
                {loggedInUser?.role === 'admin' && !userData.active && (
                    <Button variant="outline" size="sm" disabled /*onClick={handleReactivate}*/ className="border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-500 dark:hover:bg-green-900/30"> {/* Estilo ajustado para dark */}
                      Reativar (Pendente)
                    </Button>
                )}
              </CardFooter>
            </Card>
        )}
      </div>
  );
};

export default CollaboratorDetailsPage;