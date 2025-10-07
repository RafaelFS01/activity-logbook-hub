import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  FileSpreadsheet,
  Users,
  FileText,
  Activity as ActivityIcon,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { UserData } from "@/services/firebase/auth";
import { exportActivitiesToExcelStyled } from "@/utils/exportUtils";
import html2pdf from 'html2pdf.js';
import GeneralActivitiesPdfTemplate from '@/components/reports/GeneralActivitiesPdfTemplate';
import '@/components/reports/PdfReportTemplate.css';

// Novos componentes criados
import ActivityFilters from "./components/ActivityFilters";
import ActivityCard from "./components/ActivityCard";
import ActivityGrid from "./components/ActivityGrid";
import ActivityPagination from "./components/ActivityPagination";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import ActivityStats from "@/components/ui/activity-stats";

// --- Constantes ---
const ITEMS_PER_PAGE = 15;

const ActivitiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // --- Estados principais ---
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [collaborators, setCollaborators] = useState<Record<string, UserData & { uid: string }>>({});
  const [activityTypes, setActivityTypes] = useState<string[]>([]);

  // --- Estados de filtro ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<ActivityStatus[]>([]);
  const [dateType, setDateType] = useState<"startDate" | "endDate">("startDate");
  const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined);
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState<string | null>(null);

  // --- Estados de controle ---
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Ref para o template PDF
  const pdfReportRef = useRef<HTMLDivElement>(null);

  // --- UseEffects ---

  // Efeito 1: Busca inicial de dados e filtragem por role
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

      try {
        // Buscar dados em paralelo
        const [fetchedActivities, fetchedClients, collaboratorsMap, types] = await Promise.all([
          getActivities(),
          getClients(),
          fetchCollaborators(),
          getActivityTypes()
        ]);

        // Filtragem inicial por role
        const activitiesToShow = filterActivitiesByRole(fetchedActivities, user, collaboratorsMap);

        setActivities(activitiesToShow);
        setClients(Object.fromEntries(fetchedClients.map(client => [client.id, client])));
        setCollaborators(collaboratorsMap);
        setActivityTypes(types);

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as informações necessárias."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  // Funções auxiliares
  const fetchCollaborators = async (): Promise<Record<string, UserData & { uid: string }>> => {
    const collaboratorsMap: Record<string, UserData & { uid: string }> = {};
        try {
          const usersRef = ref(db, 'users');
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            const usersData = usersSnapshot.val();
            Object.entries(usersData).forEach(([uid, userData]) => {
              const typedUserData = userData as UserData;
          if (uid && typedUserData?.role) {
                collaboratorsMap[uid] = { ...typedUserData, uid };
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
    }
    return collaboratorsMap;
  };

  const filterActivitiesByRole = (
    activities: Activity[],
    currentUser: { uid: string; name: string; role: string; email: string } | null,
    collaboratorsMap: Record<string, UserData & { uid: string }>
  ): Activity[] => {
    if (!currentUser) return [];

    if (currentUser.role === 'admin') return activities;

    if (currentUser.role === 'manager') {
      return activities.filter(activity => {
            const assignedIds = activity.assignedTo;
        if (!assignedIds?.length) return false;
        if (assignedIds.includes(currentUser.uid)) return true;

            const assignedUsersData = assignedIds.map(id => collaboratorsMap[id]).filter(Boolean);
        return assignedUsersData.some(assignee => assignee.role !== 'admin');
      });
    }

    if (currentUser.role === 'collaborator') {
      return activities.filter(activity => activity.assignedTo?.includes(currentUser.uid));
    }

    return [];
  };


  // Efeito 2: Filtragem e ordenação das atividades
  useEffect(() => {
    let filtered = [...activities];

    // Aplicar filtros
    if (statusFilters.length > 0) {
      filtered = filtered.filter(activity => statusFilters.includes(activity.status));
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(activity => {
        const clientName = getClientName(activity.clientId, clients).toLowerCase();
        const responsibleNames = (activity.assignedTo ?? [])
            .map(id => collaborators[id]?.name?.toLowerCase() ?? '')
            .join(' ');

        return (
          (activity.title?.toLowerCase() ?? '').includes(lowerSearchTerm) ||
            (activity.description?.toLowerCase() ?? '').includes(lowerSearchTerm) ||
            clientName.includes(lowerSearchTerm) ||
          responsibleNames.includes(lowerSearchTerm)
        );
      });
    }

    if (startPeriod || endPeriod) {
      filtered = filtered.filter(activity => {
        const dateString = dateType === "startDate" ? activity.startDate : (activity.endDate || activity.startDate);
        if (!dateString) return false;

        try {
          const activityDate = new Date(dateString);
          const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const activityDay = startOfDay(activityDate);

          if (startPeriod && endPeriod) {
            const startDay = startOfDay(startPeriod);
            const endDay = startOfDay(endPeriod);
            return activityDay >= startDay && activityDay <= endDay;
          }
          if (startPeriod) return activityDay >= startOfDay(startPeriod);
          if (endPeriod) return activityDay <= startOfDay(endPeriod);
        } catch {
          return false;
        }
        return true;
      });
    }

    if (selectedCollaboratorId && (user?.role === 'admin' || user?.role === 'manager')) {
      filtered = filtered.filter(activity =>
        activity.assignedTo?.some(id => String(id) === String(selectedCollaboratorId))
      );
    }

    if (selectedActivityType) {
      filtered = filtered.filter(activity => activity.type === selectedActivityType);
    }

    // Ordenação
    filtered.sort((a, b) => {
      const statusPriority: Record<ActivityStatus, number> = {
        'pending': 0, 'in-progress': 1, 'completed': 2, 'cancelled': 3
      };
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });

    setFilteredActivities(filtered);
    setCurrentPage(1);
  }, [
    searchTerm, statusFilters, dateType, startPeriod, endPeriod,
    selectedCollaboratorId, selectedActivityType, user, activities, clients, collaborators
  ]);

  // Funções auxiliares
  const getClientName = (clientId: string | undefined, clientsMap: Record<string, Client>): string => {
    if (!clientId) return "Cliente não especificado";
    const client = clientsMap[clientId];
    if (!client) return `Cliente ${clientId.substring(0, 6)}...`;

    return client.type === 'juridica'
      ? ((client as any).companyName || client.name || 'Empresa sem nome')
      : (client.name || 'Cliente sem nome');
  };

  // --- Cálculos Memoizados ---

  // Calcula paginação
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
  }, [filteredActivities]);

  // Funções auxiliares
  const handleStatusChange = async (activityId: string, newStatus: ActivityStatus) => {
    if (!user?.uid) {
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: "Você precisa estar logado para alterar o status."
      });
      return;
    }

    const previousActivities = [...activities];

    // Atualização otimista
    setActivities(prevActivities =>
        prevActivities.map(activity =>
            activity.id === activityId
          ? { ...activity, status: newStatus, updatedAt: new Date().toISOString() }
                : activity
        )
    );

    try {
      await updateActivityStatus(activityId, newStatus, user.uid);
      const statusTextMap: Record<ActivityStatus, string> = {
        pending: 'futura', 'in-progress': 'em progresso', completed: 'concluída', cancelled: 'cancelada'
      };
      toast({
        title: "Status atualizado",
        description: `Atividade marcada como ${statusTextMap[newStatus]}.`
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível salvar a alteração de status. Revertendo."
      });
      setActivities(previousActivities);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilters([]);
    setStartPeriod(undefined);
    setEndPeriod(undefined);
    setDateType("startDate");
    setSelectedCollaboratorId(null);
    setSelectedActivityType(null);
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filteredActivities.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não há atividades filtradas para exportar."
      });
      return;
    }

    try {
      const activitiesToExport = filteredActivities.map(activity => ({
        ...activity,
        clientName: getClientName(activity.clientId, clients),
      }));

      const assigneeMap: Record<string, string> = {};
      Object.entries(collaborators).forEach(([id, collab]) => {
        assigneeMap[id] = collab.name || `Usuário ${id.substring(0, 6)}`;
      });

      exportActivitiesToExcelStyled(activitiesToExport, 'atividades_exportadas.xlsx', assigneeMap);
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

  const handleExportPdf = async () => {
    if (!pdfReportRef.current || filteredActivities.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não há atividades filtradas para gerar o PDF."
      });
      return;
    }

    setIsGeneratingPdf(true);
    
    try {
      const emissionDate = new Date().toLocaleDateString('pt-BR');
      const fileName = `Relatorio_Geral_Atividades_${emissionDate.replace(/\//g, '-')}.pdf`;

      const options = {
        margin: [10, 0, 5, 5],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          logging: false,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { 
          mode: ['css', 'legacy'],
          avoid: ['.pdf-activity-title']
        }
      };

      await html2pdf().from(pdfReportRef.current).set(options).save();

      toast({
        title: "PDF Gerado",
        description: `O arquivo ${fileName} foi baixado com sucesso.`
      });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: "Ocorreu um problema ao gerar o arquivo PDF."
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // --- Renderização do Componente ---
  return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-lg shrink-0">
              <ActivityIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div className="min-w-0 flex-1 sm:flex-none">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Gerenciamento de Atividades
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed">
                Gerencie e acompanhe todas as suas atividades de forma eficiente
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Botão Exportar Excel */}
            <Button
                variant="outline"
                onClick={handleExport}
                disabled={isLoading || filteredActivities.length === 0}
                className="flex-1 sm:flex-none text-sm sm:text-base"
            >
              <FileSpreadsheet className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
              <span className="sm:hidden">Excel</span>
              <span className="ml-1">({filteredActivities.length})</span>
            </Button>

            {/* Botão Exportar PDF */}
            <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={isLoading || filteredActivities.length === 0 || isGeneratingPdf}
                className="flex-1 sm:flex-none text-sm sm:text-base"
            >
              <FileText className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">
                {isGeneratingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
              </span>
              <span className="sm:hidden">
                {isGeneratingPdf ? 'Gerando...' : 'PDF'}
              </span>
              {!isGeneratingPdf && <span className="ml-1">({filteredActivities.length})</span>}
            </Button>

            {/* Botão Nova Atividade */}
            <Button
                onClick={() => navigate("/activities/new")}
                disabled={isLoading}
                className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-sm sm:text-base"
            >
              <PlusCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Nova Atividade</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        </div>
        </div>

      {/* Sistema de Filtros */}
      <ActivityFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilters={statusFilters}
        setStatusFilters={setStatusFilters}
        dateType={dateType}
        setDateType={setDateType}
        startPeriod={startPeriod}
        setStartPeriod={setStartPeriod}
        endPeriod={endPeriod}
        setEndPeriod={setEndPeriod}
        selectedCollaboratorId={selectedCollaboratorId}
        setSelectedCollaboratorId={setSelectedCollaboratorId}
        selectedActivityType={selectedActivityType}
        setSelectedActivityType={setSelectedActivityType}
        collaborators={collaborators}
        activityTypes={activityTypes}
        clients={clients}
        user={user}
        isLoading={isLoading}
        resetFilters={resetFilters}
        onSearchChange={(value) => {
          // Callback adicional se necessário
        }}
      />

      {/* Estatísticas Rápidas */}
      {!isLoading && filteredActivities.length > 0 && (
        <ActivityStats
          stats={{
            total: filteredActivities.length,
            pending: filteredActivities.filter(a => a.status === 'pending').length,
            inProgress: filteredActivities.filter(a => a.status === 'in-progress').length,
            completed: filteredActivities.filter(a => a.status === 'completed').length,
          }}
        />
      )}

      {/* Conteúdo Principal */}
        {isLoading ? (
        <ActivityGrid isLoading={true}>{null}</ActivityGrid>
        ) : filteredActivities.length > 0 ? (
            <>
          <ActivityGrid>
                {paginatedActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                clients={clients}
                collaborators={collaborators}
                onStatusChange={handleStatusChange}
              />
            ))}
          </ActivityGrid>

          <ActivityPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredActivities.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
            </>
        ) : (
        <EmptyState
          icon={ActivityIcon}
          title="Nenhuma atividade encontrada"
          description={
            searchTerm || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId || selectedActivityType
                    ? "Não encontramos atividades que correspondam aos seus filtros. Tente ajustá-los ou limpá-los."
              : "Ainda não há atividades cadastradas ou visíveis para você nesta seção."
          }
          action={{
            label: "Criar Nova Atividade",
            onClick: () => navigate("/activities/new")
          }}
        />
        )}

        {/* Template PDF oculto */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={pdfReportRef}>
            <GeneralActivitiesPdfTemplate
              activities={filteredActivities}
              clients={clients}
              assignees={Object.entries(collaborators).reduce((acc, [id, user]) => { 
                acc[id] = user.name || `Usuário ${id.substring(0, 5)}`; 
                return acc; 
              }, {} as Record<string, string>)}
              emissionDate={new Date().toLocaleDateString('pt-BR')}
              totalActivities={activities.length}
              filterInfo={{
                searchTerm: searchTerm || undefined,
                statusFilters: statusFilters.length > 0 ? statusFilters : undefined,
                dateType,
                startPeriod,
                endPeriod,
                selectedCollaborator: selectedCollaboratorId || undefined,
                selectedType: selectedActivityType || undefined,
              }}
            />
          </div>
        </div>
      </div>
  );
};

export default ActivitiesPage;