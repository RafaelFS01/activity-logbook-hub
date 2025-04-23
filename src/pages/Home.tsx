import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, subDays, startOfDay, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Filter, UserRound, Building } from 'lucide-react';
import { getActivities, Activity, ActivityStatus } from '@/services/firebase/activities';
import { getClients, Client } from '@/services/firebase/clients';
import { getCollaboratorById, CollaboratorData } from '@/services/firebase/collaborators';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<ActivityStatus[]>(['in-progress']);
  const [clients, setClients] = useState<Client[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const [loadingCollaborators, setLoadingCollaborators] = useState<boolean>(false); // Estado de loading específico para colaboradores

  const statusOptions: { label: string; value: ActivityStatus }[] = [
    { label: 'Pendente', value: 'pending' },
    { label: 'Em Progresso', value: 'in-progress' },
    { label: 'Concluído', value: 'completed' },
    { label: 'Cancelado', value: 'cancelled' },
  ];

  // Busca inicial de atividades e clientes
  useEffect(() => {
    const fetchActivitiesAndClients = async () => {
      try {
        setLoading(true); // Loading principal ativo
        const [allActivities, allClients] = await Promise.all([
          getActivities(),
          getClients()
        ]);
        setActivities(allActivities);
        setClients(allClients.filter(client => client.active)); // Mantendo o filtro de ativos para o Select

      } catch (error) {
        console.error('Erro ao buscar atividades ou clientes:', error);
        // Considerar adicionar um toast de erro aqui
      } finally {
        setLoading(false); // Loading principal desativado após buscar atividades e clientes
      }
    };

    fetchActivitiesAndClients();
  }, []); // Roda apenas uma vez na montagem

  // Busca de colaboradores quando as atividades mudam e o loading principal termina
  useEffect(() => {
    const fetchCollaborators = async () => {
      // Só busca se houver atividades e os colaboradores ainda não foram carregados
      if (activities.length === 0 || collaborators.length > 0) {
        if (collaborators.length > 0) setLoadingCollaborators(false); // Garante que o loading para se já temos dados
        return;
      }

      try {
        setLoadingCollaborators(true); // Ativa loading de colaboradores
        // Pega todos os UIDs únicos de todas as atividades
        const collaboratorIds = [...new Set(activities.flatMap(activity => activity.assignedTo || []))]; // Garante que assignedTo exista

        if (collaboratorIds.length === 0) {
          setLoadingCollaborators(false); // Não há colaboradores para buscar
          return;
        }

        // Busca os dados de cada colaborador em paralelo
        const collaboratorPromises = collaboratorIds.map(id => getCollaboratorById(id));
        const collaboratorResults = await Promise.all(collaboratorPromises);

        // Filtra resultados nulos (colaboradores não encontrados) e atualiza o estado
        setCollaborators(collaboratorResults.filter((data): data is CollaboratorData => data !== null));

      } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
        // Considerar adicionar um toast de erro aqui se necessário
      } finally {
        setLoadingCollaborators(false); // Desativa loading de colaboradores
      }
    };

    // Roda a busca de colaboradores APENAS quando o loading principal (atividades/clientes) termina
    if (!loading) {
      fetchCollaborators();
    }

    // Dependências: Roda quando 'activities' muda ou quando 'loading' (principal) vira false.
    // 'collaborators.length' evita re-buscas desnecessárias.
  }, [activities, loading, collaborators.length]);


  // Função para verificar se a atividade está ativa na data selecionada e com os filtros
  const isActivityActiveOnDate = (activity: Activity, date: Date): boolean => {
    // Filtro de Status
    if (!statusFilter.includes(activity.status)) {
      return false;
    }
    // Filtro de Cliente
    if (selectedClient && activity.clientId !== selectedClient) {
      return false;
    }
    // Filtro de Colaborador
    if (selectedCollaborator && !(activity.assignedTo || []).includes(selectedCollaborator)) { // Garante que assignedTo exista
      return false;
    }

    // Lógica de Data
    const selectedDateStart = startOfDay(date);
    let startDate: Date;
    try {
      startDate = startOfDay(parseISO(activity.startDate));
    } catch (e) {
      console.warn("Data de início inválida para atividade:", activity.id, activity.startDate);
      return false; // Não mostrar atividade com data inválida
    }

    // Se não tem data final
    if (!activity.endDate) {
      // Se 'in-progress', mostra no dia de início e dias posteriores
      if (activity.status === 'in-progress') {
        return isSameDay(startDate, selectedDateStart) || startDate <= selectedDateStart;
      }
      // Para outros status sem data final, mostra apenas no dia de início
      return isSameDay(startDate, selectedDateStart);
    }

    // Se tem data final
    let endDate: Date;
    try {
      endDate = startOfDay(parseISO(activity.endDate));
    } catch(e) {
      console.warn("Data de término inválida para atividade:", activity.id, activity.endDate);
      // Decide como tratar: talvez mostrar se a data de início for válida?
      // Por segurança, retornamos false se a data final for inválida.
      return false;
    }

    // Verifica se a data selecionada está dentro do intervalo (inclusive)
    return isWithinInterval(selectedDateStart, { start: startDate, end: endDate });
  };

  // Filtra as atividades para o dia selecionado usando a função acima
  const activitiesForSelectedDate = activities.filter(activity =>
      isActivityActiveOnDate(activity, selectedDate)
  );

  // Funções de navegação de data
  const goToNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };

  const goToPreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };

  // Função para lidar com a seleção/desseleção de status no filtro
  const handleStatusToggle = (status: ActivityStatus) => {
    setStatusFilter(prevFilter => {
      if (prevFilter.includes(status)) {
        return prevFilter.filter(s => s !== status); // Remove se já existe
      } else {
        return [...prevFilter, status]; // Adiciona se não existe
      }
    });
  };

  // Função para limpar todos os filtros
  const resetFilters = () => {
    setStatusFilter(['in-progress']); // Volta ao padrão
    setSelectedClient(null);
    setSelectedCollaborator(null);
  };

  // Opções formatadas para o Combobox de clientes
  const clientOptions = clients.map(client => ({
    value: client.id,
    // Ajuste para pegar nome ou nome fantasia/razão social
    label: client.name || (client as any).companyName || 'Cliente sem nome'
  }));

  // Opções formatadas para o Combobox de colaboradores (mostra vazio enquanto carrega)
  const collaboratorOptions = loadingCollaborators
      ? [] // Retorna vazio enquanto carrega para o Combobox mostrar "Carregando..."
      : collaborators.map(collaborator => ({
        value: collaborator.uid,
        label: collaborator.name || collaborator.email || 'Colaborador sem nome' // Usa nome ou email como fallback
      }));

  // --- Função auxiliar para obter nome do cliente ---
  const getClientName = (clientId: string): string | undefined => {
    const client = clients.find(c => c.id === clientId);
    // Ajuste aqui se necessário para nome fantasia vs razão social etc.
    return client?.name || (client as any)?.companyName;
  };

  // --- Função auxiliar para obter nomes dos colaboradores ---
  const getCollaboratorNames = (assignedToIds: string[]): string[] => {
    if (!assignedToIds || assignedToIds.length === 0) return []; // Retorna array vazio se não houver IDs
    return assignedToIds
        .map(id => {
          const collaborator = collaborators.find(col => col.uid === id);
          return collaborator?.name || collaborator?.email; // Retorna nome ou email
        })
        .filter((name): name is string => !!name); // Filtra nulos/undefined e garante que é string[]
  };


  // --- Renderização do Componente ---
  return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Agenda de Atividades</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie as atividades para cada dia.
          </p>
        </div>

        {/* Barra de Controles (Data e Filtros) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          {/* Controles de Data */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Seletor de Data */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className={cn("p-3 pointer-events-auto")}
                    locale={pt} // Define o locale para português
                    initialFocus
                />
              </PopoverContent>
            </Popover>
            {/* Botões de Navegação de Dia */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousDay} aria-label="Dia anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextDay} aria-label="Próximo dia">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Controles de Filtro */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro Colaborador */}
            <div className="flex items-center gap-2 w-full sm:w-[250px]">
              <UserRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Combobox
                  options={collaboratorOptions}
                  selectedValue={selectedCollaborator}
                  onSelect={setSelectedCollaborator}
                  placeholder="Filtrar por colaborador"
                  searchPlaceholder="Buscar colaborador..."
                  noResultsText={loadingCollaborators ? "Carregando..." : "Nenhum colaborador encontrado"}
                  allowClear={true}
                  disabled={loadingCollaborators} // Desabilita enquanto carrega
                  className="w-full" // Garante que o combobox ocupe o espaço
              />
            </div>
            {/* Filtro Cliente */}
            <div className="flex items-center gap-2 w-full sm:w-[250px]">
              <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Combobox
                  options={clientOptions}
                  selectedValue={selectedClient}
                  onSelect={setSelectedClient}
                  placeholder="Filtrar por cliente"
                  searchPlaceholder="Buscar cliente..."
                  noResultsText="Nenhum cliente encontrado"
                  allowClear={true}
                  disabled={loading} // Desabilita se os clientes (parte do loading principal) ainda não carregaram
                  className="w-full"
              />
            </div>
            {/* Filtro Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto justify-center">
                  <Filter className="h-4 w-4" />
                  <span>Status ({statusFilter.length})</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-background" align="end">
                <DropdownMenuLabel>Status da atividade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-2">
                  {statusOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                            id={`status-${option.value}`}
                            checked={statusFilter.includes(option.value)}
                            onCheckedChange={() => handleStatusToggle(option.value)}
                            aria-label={option.label}
                        />
                        <label
                            htmlFor={`status-${option.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Botão Limpar Filtros */}
            <Button variant="outline" onClick={resetFilters} className="whitespace-nowrap w-full sm:w-auto justify-center">
              Limpar filtros
            </Button>
          </div>
        </div>

        {/* Área de Exibição das Atividades */}
        <div className="space-y-4">
          {/* Título da Seção */}
          <h2 className="text-xl font-semibold">
            Atividades para {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
          </h2>

          {/* --- Estado de Carregamento Principal --- */}
          {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-6 w-2/3 mb-1" /> {/* Title */}
                        <Skeleton className="h-4 w-1/2 mb-2" /> {/* Date */}
                        <Skeleton className="h-5 w-1/4" />      {/* Status Badge */}
                      </CardHeader>
                      <CardContent className="pb-3">
                        <Skeleton className="h-4 w-full mb-1" /> {/* Description line 1 */}
                        <Skeleton className="h-4 w-5/6" />      {/* Description line 2 */}
                      </CardContent>
                      <CardFooter className="pt-2 pb-3 border-t flex flex-wrap gap-2">
                        <Skeleton className="h-5 w-1/5" /> {/* Type Badge */}
                        <Skeleton className="h-5 w-1/3" /> {/* Client Badge */}
                        <Skeleton className="h-5 w-1/3" /> {/* Collaborator Badge */}
                      </CardFooter>
                    </Card>
                ))}
              </div>
              // --- Estado com Atividades ---
          ) : activitiesForSelectedDate.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activitiesForSelectedDate.map((activity) => {
                  // Busca os nomes dentro do map para cada atividade
                  const clientName = getClientName(activity.clientId);
                  // Garante que assignedTo exista e seja um array antes de passar para a função
                  const collaboratorNames = getCollaboratorNames(activity.assignedTo || []);

                  return (
                      <Card
                          key={activity.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between" // Flex column para footer fixo em baixo
                          onClick={() => navigate(`/activities/${activity.id}`)}
                          role="button"
                          tabIndex={0} // Torna o card focável
                          aria-label={`Ver detalhes da atividade ${activity.title}`}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/activities/${activity.id}`); }} // Navegação por teclado
                      >
                        {/* Conteúdo Principal (Header + Content) */}
                        <div>
                          <CardHeader className="pb-2">
                            {/* Linha: Título e Badge de Prioridade */}
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-lg font-semibold">{activity.title}</CardTitle>
                              <Badge
                                  variant={activity.priority === 'high' ? 'destructive' : activity.priority === 'medium' ? 'default' : 'secondary'}
                                  className="flex-shrink-0 capitalize" // Não encolher, capitalizar
                              >
                                {activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Média' : 'Baixa'}
                              </Badge>
                            </div>
                            {/* Linha: Datas/Horas */}
                            <CardDescription className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span className="whitespace-nowrap"> {/* Evita quebra de linha na data */}
                                {(() => {
                                  try {
                                    const start = parseISO(activity.startDate);
                                    const end = activity.endDate ? parseISO(activity.endDate) : null;
                                    // Formato mais curto se for no mesmo dia
                                    let dateString = format(start, 'dd/MM/yy HH:mm', { locale: pt });
                                    if (end) {
                                      if (isSameDay(start, end)) {
                                        dateString += ` - ${format(end, 'HH:mm', { locale: pt })}`;
                                      } else {
                                        dateString += ` - ${format(end, 'dd/MM/yy HH:mm', { locale: pt })}`;
                                      }
                                    }
                                    return dateString;
                                  } catch (e) {
                                    console.warn("Data inválida para atividade:", activity.id, activity.startDate, activity.endDate);
                                    return "Data inválida";
                                  }
                                })()}
                        </span>
                            </CardDescription>
                            {/* Linha: Badge de Status */}
                            <Badge
                                className="mt-2 w-fit" // w-fit para o badge não ocupar largura toda
                                variant={
                                  activity.status === 'completed' ? 'outline' :
                                      activity.status === 'pending' ? 'secondary' :
                                          activity.status === 'cancelled' ? 'destructive' :
                                              'default' // 'in-progress' ou outros
                                }
                            >
                              {statusOptions.find(opt => opt.value === activity.status)?.label || activity.status}
                            </Badge>
                          </CardHeader>
                          <CardContent className="pb-3 pt-1"> {/* Ajuste de padding */}
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {activity.description || <span className="italic">Sem descrição</span>}
                            </p>
                          </CardContent>
                        </div>

                        {/* Rodapé com Informações Adicionais */}
                        <CardFooter className="pt-2 pb-3 border-t mt-auto flex flex-wrap gap-2 items-center"> {/* mt-auto empurra para baixo, border-t, padding */}
                          {/* Badge Tipo (somente se existir) */}
                          {activity.type && (
                              <Badge variant="outline" className="text-xs">
                                {activity.type}
                              </Badge>
                          )}
                          {/* Badge Cliente (somente se existir nome) */}
                          {clientName && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 max-w-[150px] sm:max-w-[200px]"> {/* Limita largura */}
                                <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate" title={clientName}>{clientName}</span>
                              </Badge>
                          )}
                          {/* Badge Colaborador(es) (somente se existirem nomes) */}
                          {collaboratorNames.length > 0 && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 max-w-[150px] sm:max-w-[200px]"> {/* Limita largura */}
                                <UserRound className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate" title={collaboratorNames.join(', ')}>
                                {collaboratorNames.join(', ')}
                            </span>
                              </Badge>
                          )}
                          {/* Skeleton para Colaborador se estiver carregando E houver responsáveis atribuídos */}
                          {loadingCollaborators && (activity.assignedTo?.length ?? 0) > 0 && collaboratorNames.length === 0 && (
                              <Skeleton className="h-5 w-20 rounded-md" />
                          )}
                        </CardFooter>
                      </Card>
                  );
                })}
              </div>
              // --- Estado Sem Atividades ---
          ) : (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg bg-muted/30 text-center">
                <p className="text-lg font-medium text-muted-foreground mb-2">Nenhuma atividade encontrada.</p>
                <p className="text-sm text-muted-foreground mb-4">Não há atividades para {format(selectedDate, "dd 'de' MMMM", { locale: pt })} com os filtros selecionados.</p>
                <Button
                    variant="default" // Mudar para default para mais destaque? Ou manter link
                    size="sm"
                    onClick={() => navigate('/activities/new')}
                    className="mt-2"
                >
                  Criar nova atividade
                </Button>
                <Button variant="link" size="sm" onClick={resetFilters} className="mt-1 text-xs">
                  Limpar filtros e tentar novamente
                </Button>
              </div>
          )}
        </div>
      </div>
  );
};

export default Home;