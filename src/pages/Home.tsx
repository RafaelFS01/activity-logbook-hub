import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format, addDays, subDays, startOfDay, isSameDay, isWithinInterval, parseISO, startOfMonth, endOfMonth, addMonths, subMonths,
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { DayContentProps } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Filter, UserRound, Building, FileText } from 'lucide-react';
import { ref, get } from "firebase/database"; // Firebase Realtime DB functions

import { getActivities, Activity, ActivityStatus } from '@/services/firebase/activities';
import { getClients, Client } from '@/services/firebase/clients';
// Import UserData type (ensure it has uid and role)
import { UserData } from '@/services/firebase/auth'; // Adjust path if needed
import { useAuth } from '@/contexts/AuthContext';
import { db } from "@/lib/firebase"; // Firebase DB instance

// Import your UI components
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
// Importações para PDF
import html2pdf from 'html2pdf.js';
import AgendaPdfTemplate from '@/components/reports/AgendaPdfTemplate';
import '@/components/reports/PdfReportTemplate.css';
// Optional: Import useToast if you want to add error notifications
import { useToast } from "@/components/ui/use-toast";

const Home = () => {
  const { user } = useAuth(); // { uid, name, role, email } | null
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- States ---
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayMonth, setDisplayMonth] = useState<Date>(startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'week'>('day');
  const [activities, setActivities] = useState<Activity[]>([]); // Activities filtered by ROLE
  const [loading, setLoading] = useState<boolean>(true); // Main loading state
  const [statusFilter, setStatusFilter] = useState<ActivityStatus[]>(['in-progress', 'completed']);
  const [clients, setClients] = useState<Client[]>([]); // Active clients
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  // State to store all user data (including roles) fetched initially
  const [allUsersData, setAllUsersData] = useState<Record<string, UserData & { uid: string }>>({});
  // Estados para PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfReportRef = useRef<HTMLDivElement>(null);

  const statusOptions: { label: string; value: ActivityStatus }[] = [
    { label: 'Pendente', value: 'pending' },
    { label: 'Em Progresso', value: 'in-progress' },
    { label: 'Concluído', value: 'completed' },
    { label: 'Cancelado', value: 'cancelled' },
  ];

  // --- Data Fetching Effect (Handles Users, Activities, Clients, and Role Filtering) ---
  useEffect(() => {
    const fetchInitialData = async () => {
      // Ensure we have the logged-in user to apply role filters
      if (!user) {
        setLoading(false);
        setActivities([]);
        setClients([]);
        setAllUsersData({});
        console.log("User not logged in, clearing calendar data.");
        return;
      }

      setLoading(true);
      // Reset states before fetching
      setActivities([]);
      setClients([]);
      setAllUsersData({});

      try {
        // 1. Fetch ALL users/collaborators FIRST (to get roles)
        const fetchedUsersMap: Record<string, UserData & { uid: string }> = {}; // <-- Mude para const
        try {
          const usersRef = ref(db, 'users');
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            const usersData = usersSnapshot.val();
            Object.entries(usersData).forEach(([uid, userData]) => {
              const typedUserData = userData as UserData;
              // Ensure valid user data structure with role
              if (uid && typedUserData && typeof typedUserData === 'object' && typedUserData.role) {
                // Optionally filter inactive users here if 'active' property exists in UserData
                // if (typedUserData.active !== false) {
                fetchedUsersMap[uid] = { ...typedUserData, uid };
                // }
              } else {
                console.warn(`User data for UID ${uid} is incomplete or missing role. Excluding.`);
              }
            });
            setAllUsersData(fetchedUsersMap); // Store the complete map
            console.log("User data loaded:", Object.keys(fetchedUsersMap).length);
          } else {
            console.warn("No user data found in Firebase path 'users'.");
            // Consider if the app should proceed without user roles
          }
        } catch (userError) {
          console.error('Critical error fetching users/roles:', userError);
          // Display error toast to the user is recommended here
          // toast({ variant: "destructive", title: "Erro Crítico", description: "Não foi possível carregar os dados de permissão dos usuários." });
          setLoading(false);
          return; // Stop execution if roles cannot be fetched (security measure)
        }

        // 2. Fetch Activities and Clients in parallel
        const [fetchedActivities, fetchedClients] = await Promise.all([
          getActivities(),
          getClients()
        ]);
        console.log("Raw activities loaded:", fetchedActivities.length);
        console.log("Raw clients loaded:", fetchedClients.length);

        // 3. Apply Role-Based Filtering to Activities (using fetchedUsersMap)
        const currentUserRole = user.role;
        const currentUserId = user.uid;
        let activitiesToShow: Activity[] = [];

        if (!currentUserRole) {
          console.error("Current user role is undefined. Cannot filter activities.");
          // Handle this case appropriately - maybe show nothing or an error
        } else if (currentUserRole === 'admin') {
          activitiesToShow = fetchedActivities; // Admin sees all
        } else if (currentUserRole === 'manager') {
          // Manager: Sees own, other managers', collaborators'. NOT admin-only.
          activitiesToShow = fetchedActivities.filter(activity => {
            const assignedIds = activity.assignedTo;
            // Rule: Don't show unassigned activities (adjust if needed)
            if (!assignedIds || assignedIds.length === 0) return false;
            // Always show activities assigned to the manager themselves
            if (assignedIds.includes(currentUserId)) return true;

            // Get data for assigned users from the map we fetched
            const assignedUsersData = assignedIds
                .map(id => fetchedUsersMap[id]) // Look up in the map
                .filter((userData): userData is UserData & { uid: string } => !!userData); // Filter out undefined/invalid users

            // If an activity is assigned to IDs but none match our valid users map, hide it for safety.
            if (assignedUsersData.length === 0 && assignedIds.length > 0) {
              console.warn(`Activity ${activity.id} assigned to users not found or invalid. Hiding from Manager view.`);
              return false;
            }

            // Check if AT LEAST ONE assigned user is NOT an admin (i.e., is manager or collaborator)
            const hasNonAdminAssignee = assignedUsersData.some(
                assignee => assignee.role === 'manager' || assignee.role === 'collaborator'
            );
            return hasNonAdminAssignee; // Show if true
          });
        } else if (currentUserRole === 'collaborator') {
          // Collaborator: Sees only their own assigned activities
          activitiesToShow = fetchedActivities.filter(activity =>
              activity.assignedTo?.includes(currentUserId)
          );
        } else {
          // Unknown role or error case
          activitiesToShow = [];
          console.warn("Unknown user role for activity filtering:", currentUserRole);
        }

        console.log(`Activities after role filter ('${currentUserRole}'):`, activitiesToShow.length);
        setActivities(activitiesToShow); // Set state with ROLE-FILTERED activities

        // Set clients (filtering out inactive ones)
        setClients(fetchedClients.filter(client => client.active !== false));
        console.log("Active clients set:", clients.length);

      } catch (error) {
        console.error('Error during initial data fetch for calendar:', error);
        // Display error toast to the user is recommended here
        // toast({ variant: "destructive", title: "Erro ao Carregar Dados", description: "Não foi possível carregar os dados da agenda." });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Dependency: Re-run if the logged-in user changes
  }, [user]); // Removed toast dependency unless used within this effect

  // Sync displayMonth with selectedDate if needed (primarily for month view and popover)
  useEffect(() => {
    const targetMonth = startOfMonth(selectedDate);
    if (!isSameDay(targetMonth, displayMonth)) {
      setDisplayMonth(targetMonth);
    }
  }, [selectedDate, displayMonth]);

  // --- Date Logic and Filtering ---
  const isActivityActiveOnDate = useCallback((activity: Activity, date: Date): boolean => {
    const selectedDateStart = startOfDay(date);
    let startDate: Date;
    try {
      // Ensure startDate is valid before proceeding
      if (!activity.startDate) throw new Error('Missing start date');
      startDate = startOfDay(parseISO(activity.startDate));
      if (isNaN(startDate.getTime())) throw new Error('Invalid start date');
    } catch (e: any) {
      console.warn(`Invalid or missing start date for activity ${activity.id}: ${activity.startDate}`, e.message);
      return false; // Cannot determine activity timing without a valid start date
    }

    // Handle activities without an end date
    if (!activity.endDate) {
      // 'in-progress' without end date: shown on start day and potentially subsequent days
      // Let's refine: show if start date is <= selected date (active from start onwards until changed/completed)
      // However, for simplicity in calendar view, showing ONLY on start date might be less confusing unless it's explicitly a multi-day task
      // Sticking to original logic: show only on start day for non-'in-progress'
      // Consider a separate field like 'isRecurring' or 'isOngoing' if needed.
      // Current logic: Show 'in-progress' from start date onwards, others only on start date.
      // Let's adjust to: ONLY show on exact start date if no end date, regardless of status, for calendar clarity.
      // If you need multi-day visibility for tasks without end dates, this needs rethinking.
      // REVISED LOGIC: Show only on the start day if no end date.
      return isSameDay(startDate, selectedDateStart);
    }

    // Handle activities with an end date
    let endDate: Date;
    try {
      endDate = startOfDay(parseISO(activity.endDate));
      if (isNaN(endDate.getTime())) throw new Error('Invalid end date');
    } catch (e: any) {
      console.warn(`Invalid end date for activity ${activity.id}: ${activity.endDate}. Treating as single-day.`, e.message);
      // Fallback: Treat as a single-day activity on the start date if end date is invalid
      return isSameDay(startDate, selectedDateStart);
    }

    // Ensure start date is not after end date
    if (startDate > endDate) {
      console.warn(`Activity ${activity.id} has start date after end date. Hiding.`);
      return false;
    }

    // Check if the selected date is within the interval [start, end] (inclusive)
    return isWithinInterval(selectedDateStart, { start: startDate, end: endDate });
  }, []); // Empty dependency array - relies only on arguments

  // --- Derived Data for Views ---

  // Base filtered activities (Status, Client, Collaborator filters applied to ROLE-FILTERED list)
  const baseFilteredActivities = useMemo(() => {
    // Start with the activities already filtered by role
    return activities.filter(activity => {
      const passesStatusFilter = statusFilter.length === 0 || statusFilter.includes(activity.status);
      const passesClientFilter = !selectedClient || activity.clientId === selectedClient;
      const passesCollabFilter = !selectedCollaborator || (activity.assignedTo || []).includes(selectedCollaborator);
      return passesStatusFilter && passesClientFilter && passesCollabFilter;
    });
  }, [activities, statusFilter, selectedClient, selectedCollaborator]);

  // Activities specifically for the selected date (for Day View)
  const activitiesForSelectedDate = useMemo(() => {
    // Filter the already base-filtered activities by the selected date
    return baseFilteredActivities.filter(activity =>
        isActivityActiveOnDate(activity, selectedDate)
    );
  }, [baseFilteredActivities, selectedDate, isActivityActiveOnDate]);


  // --- Week View Specific Calculations ---
  const currentWeekStart = useMemo(() => {
    return startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday as start
  }, [selectedDate]);

  const currentWeekEnd = useMemo(() => {
    return endOfWeek(selectedDate, { weekStartsOn: 1 }); // Sunday as end
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
  }, [currentWeekStart, currentWeekEnd]);

  // Pre-filter activities that intersect with the current week's interval (for Week View performance)
  const activitiesForCurrentWeekView = useMemo(() => {
    // Filter the baseFilteredActivities (which are already role and UI filtered)
    return baseFilteredActivities.filter(activity => {
      try {
        if (!activity.startDate) return false; // Cannot place without start date
        const activityStart = startOfDay(parseISO(activity.startDate));
        if (isNaN(activityStart.getTime())) return false; // Invalid start date

        // Use activityStart if endDate is missing or invalid
        let activityEnd = activityStart;
        if (activity.endDate) {
          try {
            const parsedEnd = startOfDay(parseISO(activity.endDate));
            if (!isNaN(parsedEnd.getTime()) && parsedEnd >= activityStart) {
              activityEnd = parsedEnd;
            }
          } catch { /* ignore invalid end date, use start date */}
        }

        // Overlap check: (ActivityStart <= WeekEnd) AND (ActivityEnd >= WeekStart)
        return activityStart <= currentWeekEnd && activityEnd >= currentWeekStart;

      } catch (e) {
        console.warn("Error parsing date in activity filter for week view:", activity.id, e);
        return false;
      }
    });
  }, [baseFilteredActivities, currentWeekStart, currentWeekEnd]);


  // --- Navigation and Interaction Handlers ---
  const goToNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(prevDate => addDays(prevDate, 1));
    } else if (viewMode === 'week') {
      // When navigating week, set selectedDate to the start of the next week for consistency
      setSelectedDate(prevDate => startOfWeek(addWeeks(prevDate, 1), { weekStartsOn: 1 }));
    } else { // month
      setDisplayMonth(prevMonth => addMonths(prevMonth, 1));
    }
  };

  const goToPrevious = () => {
    if (viewMode === 'day') {
      setSelectedDate(prevDate => subDays(prevDate, 1));
    } else if (viewMode === 'week') {
      // When navigating week, set selectedDate to the start of the previous week
      setSelectedDate(prevDate => startOfWeek(subWeeks(prevDate, 1), { weekStartsOn: 1 }));
    } else { // month
      setDisplayMonth(prevMonth => subMonths(prevMonth, 1));
    }
  };

  const handleDayClickInMonthView = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date); // Update the main selected date
      setViewMode('day');   // Switch to daily view
    }
  };

  const handleDateSelectPopover = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      // Optional: switch view mode if needed, e.g., always switch to day view
      // setViewMode('day');
    }
  };

  const handleStatusToggle = (status: ActivityStatus) => {
    setStatusFilter(prevFilter =>
        prevFilter.includes(status)
            ? prevFilter.filter(s => s !== status)
            : [...prevFilter, status]
    );
  };

  const resetFilters = () => {
    setStatusFilter(['in-progress', 'completed']); // Reset to default
    setSelectedClient(null);
    setSelectedCollaborator(null);
  };

  // Função para obter atividades específicas do período selecionado
  const getActivitiesForSelectedPeriod = useCallback(() => {
    switch (viewMode) {
      case 'day':
        // Para o modo diário, usar as atividades já calculadas para o dia selecionado
        return activitiesForSelectedDate;
      
      case 'week':
        // Para o modo semanal, usar as atividades já calculadas para a semana atual
        return activitiesForCurrentWeekView;
      
      case 'month':
        // Para o modo mensal, filtrar atividades que estão no mês selecionado
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        
        return baseFilteredActivities.filter(activity => {
          try {
            if (!activity.startDate) return false;
            const activityStart = startOfDay(parseISO(activity.startDate));
            if (isNaN(activityStart.getTime())) return false;

            // Use activityStart if endDate is missing or invalid
            let activityEnd = activityStart;
            if (activity.endDate) {
              try {
                const parsedEnd = startOfDay(parseISO(activity.endDate));
                if (!isNaN(parsedEnd.getTime()) && parsedEnd >= activityStart) {
                  activityEnd = parsedEnd;
                }
              } catch { /* ignore invalid end date, use start date */ }
            }

            // Check if activity overlaps with the selected month
            return activityStart <= monthEnd && activityEnd >= monthStart;
          } catch (e) {
            console.warn("Error parsing date in month filter:", activity.id, e);
            return false;
          }
        });
      
      default:
        return baseFilteredActivities;
    }
  }, [viewMode, activitiesForSelectedDate, activitiesForCurrentWeekView, baseFilteredActivities, selectedDate]);

  // Função para exportar agenda para PDF
  const handleExportPdf = async () => {
    const activitiesForPeriod = getActivitiesForSelectedPeriod();
    
    if (!pdfReportRef.current || activitiesForPeriod.length === 0) {
      const periodText = viewMode === 'day' ? 'dia' : viewMode === 'week' ? 'semana' : 'mês';
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Não há atividades para gerar o PDF da agenda para este ${periodText}.`
      });
      return;
    }

    setIsGeneratingPdf(true);
    
    try {
      const emissionDate = new Date().toLocaleDateString('pt-BR');
      const viewModeText = viewMode === 'day' ? 'Diario' : viewMode === 'week' ? 'Semanal' : 'Mensal';
      const dateText = format(selectedDate, 'dd-MM-yyyy');
      const fileName = `Agenda_${viewModeText}_${dateText}.pdf`;

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
        title: "PDF da Agenda Gerado",
        description: `O arquivo ${fileName} foi baixado com sucesso.`
      });

    } catch (error) {
      console.error("Erro ao gerar PDF da agenda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: "Ocorreu um problema ao gerar o arquivo PDF da agenda."
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handler for internal calendar navigation (month view)
  const handleInternalMonthChange = (newMonth: Date) => {
    setDisplayMonth(startOfMonth(newMonth)); // Ensure it's always the start of the month
  };

  // --- Combobox Options (using allUsersData now) ---
  const collaboratorOptions = useMemo(() => {
    // Use allUsersData fetched initially
    if (!allUsersData || Object.keys(allUsersData).length === 0) return [];

    // Map all valid users to options
    // Optional: Filter further here if needed (e.g., only active users if 'active' exists)
    return Object.values(allUsersData)
        // .filter(collab => collab.active !== false) // Example: Filter for active users
        .map(collab => ({
          value: collab.uid,
          label: collab.name || collab.email || `Usuário ${collab.uid.substring(0, 6)}...`, // Fallback label
        }))
        .sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically
  }, [allUsersData]); // Depends on the fetched user data

  const clientOptions = useMemo(() => clients.map(client => ({
    value: client.id,
    // Handle client naming variations (pessoa fisica vs juridica)
    label: client.name || (client as any).companyName || 'Cliente sem nome'
  })).sort((a, b) => a.label.localeCompare(b.label)), [clients]); // Sort clients


  // --- Helper Functions for Names (using allUsersData and clients) ---
  const getClientName = useCallback((clientId: string | undefined): string | undefined => {
    if (!clientId) return undefined;
    const client = clients.find(c => c.id === clientId);
    return client?.name || (client as any)?.companyName; // Prioritize specific name types if necessary
  }, [clients]);

  const getCollaboratorNames = useCallback((assignedToIds: string[] | undefined): string[] => {
    if (!assignedToIds || assignedToIds.length === 0) return [];
    // Use allUsersData for lookup
    if (!allUsersData || Object.keys(allUsersData).length === 0) return ['Carregando...']; // Or empty array

    return assignedToIds
        .map(id => {
          const collaborator = allUsersData[id]; // Direct lookup in the map
          return collaborator?.name || collaborator?.email; // Use name, fallback to email
        })
        .filter((name): name is string => !!name); // Filter out any null/undefined results
  }, [allUsersData]); // Depends on the fetched user data


  // --- Internal Component for Month View Day Cell Content ---
  const CustomDayContent = useCallback((props: DayContentProps) => {
    const { date, displayMonth: currentDisplayMonth } = props;

    // Filter activities for this specific day using the already UI/Role filtered list
    const dayActivities = baseFilteredActivities.filter(activity =>
        isActivityActiveOnDate(activity, date)
    );

    const isOutside = date.getMonth() !== currentDisplayMonth.getMonth();

    return (
        <div className={cn(
            "flex flex-col items-start h-full w-full relative p-1 min-h-[120px]", // Ensure min height and padding
            isOutside ? "text-muted-foreground/50 pointer-events-none" : "" // Dim outside days
        )}>
          {/* Day Number */}
          <span className={cn(
              "self-end text-xs font-medium mb-1 px-1", // Position top-right corner
              isSameDay(date, new Date()) && !isOutside ? "text-primary font-bold underline decoration-primary/50 underline-offset-2" : "", // Highlight today's number
              isOutside && "text-inherit" // Inherit dimmed color if outside
          )}>
            {format(date, 'd')}
          </span>

          {/* Activity Badges Container */}
          <div className="flex-grow space-y-0.5 overflow-hidden w-full">
            {loading && !isOutside ? ( // Show skeleton only for days in the current month during loading
                <>
                  <Skeleton className="h-3 w-full rounded-sm mt-1" />
                  <Skeleton className="h-3 w-3/4 rounded-sm mt-1" />
                </>
            ) : (
                !isOutside && dayActivities.slice(0, 3).map(activity => ( // Limit visible badges (e.g., to 3)
                    <Badge
                        key={activity.id}
                        variant={ // Dynamic badge variant based on status/priority
                          activity.status === 'cancelled' ? 'destructive' : // Cancelada = Destructive
                              activity.priority === 'high' ? 'destructive' : // Alta Prioridade = Destructive (ou default se preferir)
                                  activity.status === 'completed' ? 'outline' : // Concluída = Outline (sutil)
                                      activity.status === 'in-progress' ? 'default' : // Em Progresso = Default (destaque primário)
                                          'secondary' // Pendente/Outros = Secondary
                        }
                        className="text-[10px] p-0.5 px-1 leading-tight truncate block w-full font-normal cursor-pointer hover:opacity-80"
                        title={activity.title}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering day click
                          navigate(`/activities/${activity.id}`);
                        }}
                    >
                      {activity.title}
                    </Badge>
                ))
            )}
            {!loading && !isOutside && dayActivities.length > 3 && ( // Indicator for more activities
                <Badge
                    variant="ghost" // Use a subtle variant
                    className="text-[10px] p-0 px-1 leading-tight block w-full font-normal text-muted-foreground mt-0.5 text-center"
                >
                  +{dayActivities.length - 3} mais
                </Badge>
            )}
          </div>
        </div>
    );
    // Depend on filtered activities, date check logic, loading state, and navigation
  }, [baseFilteredActivities, isActivityActiveOnDate, loading, navigate]);

  // --- Component Rendering ---
  return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Page Header - Melhorado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Agenda de Atividades</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie suas atividades de forma eficiente através de diferentes perspectivas temporais.
            </p>
          </div>

          {/* Botão de Exportação PDF - Melhorado */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={loading || getActivitiesForSelectedPeriod().length === 0 || isGeneratingPdf}
              className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              {isGeneratingPdf ? 'Gerando PDF...' : `Exportar PDF (${getActivitiesForSelectedPeriod().length})`}
            </Button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4 relative">

          {/* Left Column: Date/View Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Picker Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn(
                    "flex items-center gap-2 w-full sm:w-auto justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground" // Style if no date selected
                )}
                    // Conditionally set width based on view mode for better text fit
                        style={{width: viewMode === 'week' ? 'auto' : '280px'}}
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {viewMode === 'week'
                        ? `Semana: ${format(currentWeekStart, 'dd/MM')} - ${format(currentWeekEnd, 'dd/MM/yy', { locale: pt })}`
                        : selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt }) : "Selecione uma data"
                    }
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelectPopover}
                    className="p-3" // Standard padding
                    locale={pt}
                    initialFocus
                    month={displayMonth} // Control the displayed month
                    onMonthChange={setDisplayMonth} // Allow navigation inside popover
                    disabled={loading} // Disable during load
                />
              </PopoverContent>
            </Popover>


            {/* External Navigation Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevious} disabled={loading} aria-label={viewMode === 'day' ? "Dia anterior" : viewMode === 'week' ? "Semana anterior" : "Mês anterior"}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext} disabled={loading} aria-label={viewMode === 'day' ? "Próximo dia" : viewMode === 'week' ? "Próxima semana" : "Próximo mês"}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day/Week/Month Toggle Buttons - Melhorado */}
            <div className="flex items-center gap-1 rounded-lg border bg-muted p-1 shadow-inner">
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "px-4 py-2 font-medium transition-all duration-200 rounded-md",
                  viewMode === 'day'
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "hover:bg-background/80 hover:scale-102"
                )}
                onClick={() => setViewMode('day')}
                disabled={loading}
              >
                Dia
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "px-4 py-2 font-medium transition-all duration-200 rounded-md",
                  viewMode === 'week'
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "hover:bg-background/80 hover:scale-102"
                )}
                onClick={() => setViewMode('week')}
                disabled={loading}
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "px-4 py-2 font-medium transition-all duration-200 rounded-md",
                  viewMode === 'month'
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "hover:bg-background/80 hover:scale-102"
                )}
                onClick={() => setViewMode('month')}
                disabled={loading}
              >
                Mês
              </Button>
            </div>
          </div>

          {/* Right Column: Filters */}
          {/* Right Column: Filters - MODIFICADO */}
          <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto"> {/* Container Principal da Direita */}
            {/* Container INTERNO: Layout horizontal para filtros */}
            <div className="flex flex-col md:flex-row items-end gap-3 w-full md:w-auto"> {/* Layout horizontal em desktop */}

              {/* Collaborator Filter - Largura Fixa */}
              <div className="flex items-center gap-2 w-80"> {/* <<<<<<< Mudado para w-64 */}
                <UserRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Combobox
                    options={collaboratorOptions}
                    selectedValue={selectedCollaborator}
                    onSelect={setSelectedCollaborator}
                    placeholder="Colaborador"
                    searchPlaceholder="Buscar..."
                    noResultsText={loading ? "Carregando..." : "Nenhum"}
                    allowClear={true}
                    disabled={loading || collaboratorOptions.length === 0}
                    className="w-full" // Combobox preenche o container de largura fixa
                />
              </div>

              {/* Client Filter - Largura Fixa */}
              <div className="flex items-center gap-2 w-80"> {/* <-- Use a MESMA largura */}
                <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Combobox
                    options={clientOptions}
                    selectedValue={selectedClient}
                    onSelect={setSelectedClient}
                    placeholder="Cliente"
                    searchPlaceholder="Buscar..."
                    noResultsText="Nenhum"
                    allowClear={true}
                    disabled={loading || clientOptions.length === 0}
                    className="w-full" // Combobox preenche o container de largura fixa
                />
              </div>

              {/* Status Filter - Botão com a mesma largura (opcional, para alinhamento) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* Botão agora também com largura fixa e conteúdo centralizado */}
                  <Button variant="outline" className="flex items-center gap-2 w-56 justify-center" disabled={loading}>
                    <Filter className="h-4 w-4" />
                    <span>Status ({statusFilter.length})</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-background" align="end"> {/* Ajuste a largura do popover se necessário */}
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
            </div>

            {/* Reset Filters Button (posição inalterada relativa ao container principal) */}
            {(statusFilter.length !== 2 || !statusFilter.includes('in-progress') || !statusFilter.includes('completed') || selectedClient || selectedCollaborator) && (
                <Button variant="link" onClick={resetFilters} disabled={loading} className="whitespace-nowrap w-auto justify-end text-muted-foreground hover:text-foreground h-auto p-0 text-sm self-end mt-1 md:mt-0"> {/* Ajuste a margem se necessário */}
                  Limpar filtros
                </Button>
            )}
          </div> {/* Fim da Coluna Direita */}

        </div> {/* Fim da Controls Bar */}

        {/* --- Activity Display Area (Conditional) --- */}
        <div className="mt-6">
          {viewMode === 'day' ? (
              // --- Daily View - Melhorado ---
              <div className="space-y-6">
                {/* Cabeçalho da Visualização Diária */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">
                      Atividades do Dia
                    </h2>
                    <p className="text-muted-foreground">
                      {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt }) : 'Data não selecionada'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>{activitiesForSelectedDate.filter(a => a.status === 'completed').length} concluídas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>{activitiesForSelectedDate.filter(a => a.status === 'in-progress').length} em progresso</span>
                    </div>
                  </div>
                </div>
                {/* Loading State */}
                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                          <Card key={i}>
                            <CardHeader className="pb-2"><Skeleton className="h-6 w-2/3 mb-1" /><Skeleton className="h-4 w-1/2 mb-2" /><Skeleton className="h-5 w-1/4" /></CardHeader>
                            <CardContent className="pb-3"><Skeleton className="h-4 w-full mb-1" /><Skeleton className="h-4 w-5/6" /></CardContent>
                            <CardFooter className="pt-2 pb-3 border-t flex flex-wrap gap-2"><Skeleton className="h-5 w-1/5" /><Skeleton className="h-5 w-1/3" /><Skeleton className="h-5 w-1/3" /></CardFooter>
                          </Card>
                      ))}
                    </div>
                    // Data Loaded - With Activities
                ) : activitiesForSelectedDate.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> {/* Maybe more columns? */}
                      {activitiesForSelectedDate.map((activity) => {
                        const clientName = getClientName(activity.clientId);
                        const collaboratorNames = getCollaboratorNames(activity.assignedTo);
                        const priorityLabel = { low: 'Baixa', medium: 'Média', high: 'Alta' }[activity.priority] || 'N/D';
                        const statusLabel = statusOptions.find(opt => opt.value === activity.status)?.label || activity.status;
                        let dateString = "Data inválida";
                        try {
                          if (activity.startDate) {
                            const start = parseISO(activity.startDate);
                            dateString = format(start, 'dd/MM/yy HH:mm', { locale: pt });
                            if (activity.endDate) {
                              const end = parseISO(activity.endDate);
                              // Show end time only if different from start time OR on a different day
                              if (!isSameDay(start, end)) {
                                dateString += ` - ${format(end, 'dd/MM/yy HH:mm', { locale: pt })}`;
                              } else if (format(start, 'HH:mm') !== format(end, 'HH:mm')) {
                                dateString += ` - ${format(end, 'HH:mm', { locale: pt })}`;
                              }
                            }
                          } else {
                            dateString = "Data de início não definida";
                          }
                        } catch (e) {
                          console.warn("Date formatting error in card:", activity.id, e);
                        }

                        return (
                            <Card
                                key={activity.id}
                                className={cn(
                                    "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm",
                                    "hover:border-primary/20 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40"
                                )}
                                onClick={() => navigate(`/activities/${activity.id}`)}
                                role="button"
                                tabIndex={0}
                                aria-label={`Ver detalhes da atividade: ${activity.title || 'sem título'}. Status: ${statusLabel}. Cliente: ${clientName || 'não informado'}. Prioridade: ${priorityLabel}`}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/activities/${activity.id}`); }}
                            >
                              {/* Indicador de Prioridade no Topo */}
                              {activity.priority === 'high' && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background shadow-lg z-10"></div>
                              )}

                              <CardHeader className="pb-3 space-y-3">
                                {/* Título e Prioridade */}
                                <div className="flex justify-between items-start gap-3">
                                  <CardTitle className="text-lg font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                    {activity.title || <span className="italic text-muted-foreground">Sem título</span>}
                                  </CardTitle>
                                  <div className="flex flex-col gap-2 items-end">
                                    {activity.priority && (
                                        <Badge
                                          variant={activity.priority === 'high' ? 'destructive' : activity.priority === 'medium' ? 'default' : 'outline'}
                                          className={cn(
                                              "capitalize text-xs font-medium px-2 py-1 shadow-sm",
                                              activity.priority === 'high' && "animate-pulse"
                                          )}
                                        >
                                          {priorityLabel}
                                        </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Data e Horário */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                                  <Clock className="h-4 w-4 flex-shrink-0" />
                                  <span className="font-medium">{dateString}</span>
                                </div>

                                {/* Status Badge */}
                                <Badge
                                    className={cn(
                                        "w-fit text-xs font-semibold px-3 py-1.5 shadow-sm",
                                        activity.status === 'cancelled' && "bg-destructive/10 text-destructive border-destructive/20",
                                        activity.status === 'completed' && "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
                                        activity.status === 'in-progress' && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
                                        activity.status === 'pending' && "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700"
                                    )}
                                    variant="outline"
                                >
                                  {statusLabel}
                                </Badge>
                              </CardHeader>

                              {/* Descrição */}
                              {activity.description && (
                                  <CardContent className="pb-4 pt-0">
                                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                      {activity.description}
                                    </p>
                                  </CardContent>
                              )}

                              {/* Footer com Metadados */}
                              <CardFooter className="pt-4 pb-5 border-t border-border/50 bg-muted/20 flex flex-wrap gap-2 items-center">
                                {activity.type && (
                                    <Badge variant="secondary" className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20">
                                      {activity.type}
                                    </Badge>
                                )}
                                {clientName && (
                                    <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1.5 max-w-[180px]">
                                      <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="truncate" title={clientName}>{clientName}</span>
                                    </Badge>
                                )}
                                {collaboratorNames.length > 0 && collaboratorNames[0] !== 'Carregando...' && (
                                    <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1.5 max-w-[180px]">
                                      <UserRound className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="truncate" title={collaboratorNames.join(', ')}>
                                        {collaboratorNames.length === 1
                                          ? collaboratorNames[0]
                                          : `${collaboratorNames[0]} +${collaboratorNames.length - 1}`}
                                      </span>
                                    </Badge>
                                )}
                                {loading && (activity.assignedTo?.length ?? 0) > 0 && collaboratorNames[0] === 'Carregando...' && (
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                )}
                              </CardFooter>
                            </Card>
                        );
                      })}
                    </div>
                    // Data Loaded - No Activities - Melhorado
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-8 border-2 border-dashed border-border/50 rounded-2xl bg-gradient-to-br from-muted/20 to-muted/5 text-center max-w-2xl mx-auto">
                      <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                        <CalendarIcon className="h-10 w-10 text-muted-foreground/60" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">Nenhuma atividade encontrada</h3>
                      <p className="text-muted-foreground mb-6 leading-relaxed max-w-md">
                        Não há atividades programadas para {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt }) : 'esta data'}
                        {selectedClient || selectedCollaborator || (statusFilter.length !== 2) ? ' com os filtros aplicados' : ''}.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3">
                        {(statusFilter.length !== 2 || !statusFilter.includes('in-progress') || !statusFilter.includes('completed') || selectedClient || selectedCollaborator) && (
                            <Button variant="outline" size="lg" onClick={resetFilters} className="px-6">
                              <Filter className="h-4 w-4 mr-2" />
                              Limpar filtros
                            </Button>
                        )}
                        <Button
                          variant="default"
                          size="lg"
                          onClick={() => navigate('/activities/new')}
                          className="px-6 shadow-lg hover:shadow-xl transition-all duration-200 group"
                        >
                          <span className="mr-2">+</span>
                          Criar nova atividade
                        </Button>
                      </div>

                      {/* Sugestões úteis */}
                      <div className="mt-8 pt-6 border-t border-border/30 w-full max-w-md">
                        <p className="text-sm text-muted-foreground mb-3 font-medium">Dicas rápidas:</p>
                        <div className="space-y-2 text-left">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <span>Use os filtros para encontrar atividades específicas</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <span>Alterne entre os modos Dia/Semana/Mês para diferentes perspectivas</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <span>Exporte relatórios em PDF para compartilhar informações</span>
                          </div>
                        </div>
                      </div>
                    </div>
                )}
              </div>
          ) : viewMode === 'month' ? (
              // --- Monthly View - Melhorado ---
              <div className="space-y-6">
                {/* Cabeçalho da Visualização Mensal */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">
                      Calendário Mensal
                    </h2>
                    <p className="text-muted-foreground">
                      {displayMonth ? format(displayMonth, "MMMM 'de' yyyy", { locale: pt }) : 'Mês não selecionado'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span>Hoje</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent"></div>
                      <span>Selecionado</span>
                    </div>
                  </div>
                </div>

                {/* Calendário Mensal Melhorado */}
                <div className="bg-card/50 rounded-2xl border border-border/50 p-8 backdrop-blur-sm shadow-lg">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDayClickInMonthView}
                    month={displayMonth}
                    onMonthChange={handleInternalMonthChange} // Use direct state setter
                    locale={pt}
                    showOutsideDays={true}
                    className="p-0 w-full"
                    classNames={{
                      months: "flex flex-col sm:flex-row p-3",
                      month: "space-y-4 w-full",
                      caption: "flex justify-center pt-1 relative items-center mb-4 text-center",
                      caption_label: "text-lg font-medium",
                      nav: "space-x-1 flex items-center absolute top-1/2 -translate-y-1/2 w-full justify-between px-4",
                      nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 relative"),
                      nav_button_previous: "left-0",
                      nav_button_next: "right-0",
                      table: "w-full border-collapse mt-0",
                      head_row: "flex border-b",
                      head_cell: "text-muted-foreground rounded-md w-[calc(100%/7)] justify-center flex font-normal text-sm pb-1 pt-1",
                      row: "flex w-full mt-0 border-b min-h-[120px]",
                      cell: cn(
                          "h-auto w-[calc(100%/7)] text-left text-sm p-0 relative",
                          "focus-within:relative focus-within:z-20 border-l first:border-l-0"
                      ),
                      day: cn(
                          buttonVariants({ variant: "ghost" }),
                          "h-full w-full p-0 absolute top-0 left-0 flex flex-col items-stretch justify-start font-normal aria-selected:opacity-100 rounded-none",
                          "hover:bg-accent/30 focus:z-10 focus:bg-accent/40",
                          "[&:has([aria-selected])]:bg-accent/50"
                      ),
                      day_selected: "bg-primary/10 text-foreground font-semibold focus:bg-primary/20",
                      day_today: "!bg-transparent",
                      day_outside: "day-outside", // Styling handled in DayContent
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                    components={{
                      DayContent: CustomDayContent // Inject custom day cell content
                    }}
                  />
                </div>
              </div>
          ) : viewMode === 'week' ? (
              // --- Weekly View - Melhorado ---
              <div className="space-y-6">
                {/* Cabeçalho da Visualização Semanal */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">
                      Semana {format(currentWeekStart, 'dd', { locale: pt })} - {format(currentWeekEnd, 'dd/MM/yyyy', { locale: pt })}
                    </h2>
                    <p className="text-muted-foreground">
                      {format(currentWeekStart, "dd 'de' MMM", { locale: pt })} a {format(currentWeekEnd, "dd 'de' MMM 'de' yyyy", { locale: pt })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span>Hoje</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent"></div>
                      <span>Selecionado</span>
                    </div>
                  </div>
                </div>

                {/* Weekly Grid Wrapper */}
                <div className="grid grid-cols-1 md:grid-cols-7 border border-b-0 rounded-lg overflow-hidden bg-card shadow-sm"> {/* Add shadow */}
                  {weekDays.map((day, index) => {
                    // Filter activities for THIS specific day from the pre-filtered week list
                    const activitiesForDay = activitiesForCurrentWeekView.filter(activity =>
                        isActivityActiveOnDate(activity, day) // Reuse the check function
                    );
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "flex flex-col border-b md:border-r p-2 min-h-[200px]", // Consistent padding and min-height
                                index === 6 && "md:border-r-0", // Remove last vertical border on desktop
                                index < 6 && "md:border-b-0", // Remove bottom border on desktop except for last row implicitly
                                "border-border/60", // Use theme border color with slight transparency
                                isToday && "bg-blue-50 dark:bg-blue-900/20", // Today highlight
                                isSelected && !isToday && "bg-accent/40 dark:bg-accent/30", // Selected day highlight (if not today)
                            )}
                        >
                          {/* Day Header */}
                          <div className="text-center font-medium text-sm mb-2 pb-1 border-b border-border/40 cursor-pointer hover:bg-muted/50 rounded-t-sm" onClick={() => handleDayClickInMonthView(day)}>
                            <span className="block capitalize text-xs font-semibold text-muted-foreground">{format(day, 'EEE', { locale: pt })}</span>
                            <span className={cn(
                                "block text-xl font-bold mt-0.5",
                                isToday ? "text-primary" : isSelected ? "text-accent-foreground" : "text-foreground"
                            )}>
                                {format(day, 'd')}
                            </span>
                          </div>

                          {/* Activities List for the Day (Scrollable) */}
                          <div className="space-y-1.5 flex-grow overflow-y-auto py-1 -mx-1 px-1"> {/* Allow scroll, manage padding */}
                            {loading ? (
                                // Skeletons matching Badge style
                                <>
                                  <Skeleton className="h-10 w-full rounded" />
                                  <Skeleton className="h-10 w-3/4 rounded mt-1.5" />
                                </>
                            ) : activitiesForDay.length > 0 ? (
                                activitiesForDay.map(activity => {
                                  const statusLabel = statusOptions.find(opt => opt.value === activity.status)?.label || activity.status;
                                  let timeString = 'Horário inválido';
                                  try {
                                    if(activity.startDate){
                                      const start = parseISO(activity.startDate);
                                      timeString = format(start, 'HH:mm', { locale: pt });
                                      if (activity.endDate) {
                                        const end = parseISO(activity.endDate);
                                        // Show end time only if different from start time OR on a different day
                                        if (!isSameDay(start, day) && isSameDay(end, day)) { // Starts before today, ends today
                                          timeString = `(...) ${format(end, 'HH:mm', { locale: pt })}`;
                                        } else if (isSameDay(start, day) && !isSameDay(end, day)) { // Starts today, ends after today
                                          timeString = `${format(start, 'HH:mm', { locale: pt })} (...)`;
                                        } else if (isSameDay(start, day) && isSameDay(end, day) && format(start, 'HH:mm') !== format(end, 'HH:mm')) { // Starts and ends today, different times
                                          timeString += ` - ${format(end, 'HH:mm', { locale: pt })}`;
                                        } else if (!isSameDay(start, day) && !isSameDay(end, day) && isWithinInterval(day, {start:start, end:end})) { // Spans multiple days including this one
                                          timeString = '(o dia todo)'; // Or adjust as needed
                                        }
                                      }
                                    } else { timeString = 'Sem hora'; }
                                  } catch { /* Keep default invalid time */}

                                  return (
                                      <div
                                          key={activity.id}
                                          className={cn(
                                              "text-[11px] p-1.5 leading-tight block w-full font-normal cursor-pointer rounded",
                                              "border",
                                              activity.status === 'completed' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800/50 hover:border-green-400' :
                                                  activity.status === 'cancelled' ? 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800/50 hover:border-red-400 opacity-70' :
                                                      activity.status === 'in-progress' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 hover:border-blue-400' :
                                                          'bg-gray-50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700/50 hover:border-gray-400', // Pending/Other
                                              "transition-colors duration-150 ease-in-out"
                                          )}
                                          title={`${activity.title} (${statusLabel})`}
                                          onClick={() => navigate(`/activities/${activity.id}`)}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/activities/${activity.id}`); }}
                                      >
                                        <span className={cn("font-semibold block truncate", activity.status === 'completed' ? 'text-green-800 dark:text-green-300' : activity.status === 'cancelled' ? 'text-red-800 dark:text-red-300 line-through' : activity.status === 'in-progress' ? 'text-blue-800 dark:text-blue-300' : 'text-gray-800 dark:text-gray-300')}>{activity.title || "Sem Título"}</span>
                                        <span className={cn("text-xs block opacity-90", activity.status === 'completed' ? 'text-green-700 dark:text-green-400' : activity.status === 'cancelled' ? 'text-red-700 dark:text-red-400' : activity.status === 'in-progress' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400')}>{timeString}</span>
                                      </div>
                                  );
                                })
                            ) : (
                                <div className="flex-grow flex items-center justify-center h-full">
                                  <p className="text-xs text-muted-foreground italic text-center opacity-75">--</p>
                                </div>
                            )}
                          </div>
                        </div>
                    );
                  })}
                </div>

                {/* Estado vazio para toda a semana - Melhorado */}
                {!loading && activitiesForCurrentWeekView.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-8 border-2 border-dashed border-border/50 rounded-2xl bg-gradient-to-br from-muted/20 to-muted/5 text-center max-w-2xl mx-auto">
                      <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                        <CalendarIcon className="h-10 w-10 text-muted-foreground/60" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">Nenhuma atividade nesta semana</h3>
                      <p className="text-muted-foreground mb-6 leading-relaxed max-w-md">
                        Não há atividades programadas para a semana de {format(currentWeekStart, "dd/MM", { locale: pt })} a {format(currentWeekEnd, "dd/MM", { locale: pt })}
                        {selectedClient || selectedCollaborator || (statusFilter.length !== 2) ? ' com os filtros aplicados' : ''}.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3">
                        {(statusFilter.length !== 2 || !statusFilter.includes('in-progress') || !statusFilter.includes('completed') || selectedClient || selectedCollaborator) && (
                            <Button variant="outline" size="lg" onClick={resetFilters} className="px-6">
                              <Filter className="h-4 w-4 mr-2" />
                              Limpar filtros
                            </Button>
                        )}
                        <Button
                          variant="default"
                          size="lg"
                          onClick={() => navigate('/activities/new')}
                          className="px-6 shadow-lg hover:shadow-xl transition-all duration-200 group"
                        >
                          <span className="mr-2">+</span>
                          Criar nova atividade
                        </Button>
                      </div>
                    </div>
                )}
              </div>
          ) : null} {/* End of viewMode conditional rendering */}
        </div>

        {/* Template PDF oculto */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={pdfReportRef}>
            <AgendaPdfTemplate
              activities={getActivitiesForSelectedPeriod()}
              clients={clients}
              allUsersData={allUsersData}
              selectedDate={selectedDate}
              viewMode={viewMode}
              emissionDate={new Date().toLocaleDateString('pt-BR')}
              filterInfo={{
                statusFilter,
                selectedClient,
                selectedCollaborator,
              }}
            />
          </div>
        </div>
      </div>
  );
};

export default Home;