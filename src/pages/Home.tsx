import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format, addDays, subDays, startOfDay, isSameDay, isWithinInterval, parseISO, startOfMonth, addMonths, subMonths,
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks // Added week functions
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { DayContentProps } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Filter, UserRound, Building } from 'lucide-react';

import { getActivities, Activity, ActivityStatus } from '@/services/firebase/activities';
import { getClients, Client } from '@/services/firebase/clients';
import { getCollaboratorById, CollaboratorData } from '@/services/firebase/collaborators';
import { useAuth } from '@/contexts/AuthContext';

// Import your UI components (assuming paths are correct based on your structure)
import { Button, buttonVariants } from '@/components/ui/button'; // Corrected import
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge'; // Corrected import
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

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- States ---
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayMonth, setDisplayMonth] = useState<Date>(startOfMonth(new Date()));
  // Add 'week' to viewMode
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'week'>('day');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<ActivityStatus[]>(['in-progress', 'completed']);
  const [clients, setClients] = useState<Client[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const [loadingCollaborators, setLoadingCollaborators] = useState<boolean>(false);

  const statusOptions: { label: string; value: ActivityStatus }[] = [
    { label: 'Pendente', value: 'pending' },
    { label: 'Em Progresso', value: 'in-progress' },
    { label: 'Concluído', value: 'completed' },
    { label: 'Cancelado', value: 'cancelled' },
  ];

  // --- Data Fetching Effects ---
  useEffect(() => {
    const fetchActivitiesAndClients = async () => {
      try {
        setLoading(true);
        const [allActivities, allClients] = await Promise.all([
          getActivities(),
          getClients()
        ]);
        setActivities(allActivities);
        setClients(allClients.filter(client => client.active));
      } catch (error) {
        console.error('Erro ao buscar atividades ou clientes:', error);
        // Consider adding an error toast here
      } finally {
        setLoading(false);
      }
    };
    fetchActivitiesAndClients();
  }, []); // Runs only once on mount

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (activities.length === 0 || collaborators.length > 0 || loading) {
        if (collaborators.length > 0 && !loadingCollaborators) return; // Skip if already loaded and not loading
        if (loading) return; // Wait for initial activities to load
      }
      try {
        setLoadingCollaborators(true);
        const collaboratorIds = [...new Set(activities.flatMap(activity => activity.assignedTo || []))];
        if (collaboratorIds.length === 0) {
          setLoadingCollaborators(false);
          return;
        }
        // Avoid refetching collaborators we already have
        const idsToFetch = collaboratorIds.filter(id => !collaborators.some(c => c.uid === id));
        if (idsToFetch.length === 0) {
          setLoadingCollaborators(false);
          return;
        }

        const collaboratorPromises = idsToFetch.map(id => getCollaboratorById(id));
        const collaboratorResults = await Promise.all(collaboratorPromises);
        const newCollaborators = collaboratorResults.filter((data): data is CollaboratorData => data !== null);

        // Merge new collaborators with existing ones, preventing duplicates
        setCollaborators(prev => {
          const existingIds = new Set(prev.map(c => c.uid));
          const uniqueNewCollaborators = newCollaborators.filter(nc => !existingIds.has(nc.uid));
          return [...prev, ...uniqueNewCollaborators];
        });

      } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
      } finally {
        setLoadingCollaborators(false);
      }
    };
    if (!loading) { // Only fetch collaborators after initial activities load
      fetchCollaborators();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, loading]); // Removed collaborators.length dependency to allow refetch if activities change

  // Sync displayMonth with selectedDate if needed (primarily for month view and popover)
  useEffect(() => {
    const targetMonth = startOfMonth(selectedDate);
    if (!isSameDay(targetMonth, displayMonth)) {
      setDisplayMonth(targetMonth);
    }
  }, [selectedDate, displayMonth]); // Keep displayMonth dependency here

  // --- Date Logic and Filtering ---
  // useCallback ensures the function identity is stable if dependencies don't change
  const isActivityActiveOnDate = useCallback((activity: Activity, date: Date): boolean => {
    const selectedDateStart = startOfDay(date);
    let startDate: Date;
    try {
      startDate = startOfDay(parseISO(activity.startDate));
    } catch (e) {
      console.warn("Invalid start date for activity:", activity.id, activity.startDate);
      return false;
    }

    if (!activity.endDate) {
      // If 'in-progress' without end date, show on start day and subsequent days UNTIL today/selected date? Let's stick to original: show if start is <= selected
      if (activity.status === 'in-progress') {
        return startDate <= selectedDateStart; // Show from start date onwards if in progress
      }
      // For other statuses without end date, show only on start day
      return isSameDay(startDate, selectedDateStart);
    }

    let endDate: Date;
    try {
      endDate = startOfDay(parseISO(activity.endDate));
    } catch (e) {
      console.warn("Invalid end date for activity:", activity.id, activity.endDate);
      // If end date is invalid, treat as if there's no end date
      if (activity.status === 'in-progress') {
        return startDate <= selectedDateStart;
      }
      return isSameDay(startDate, selectedDateStart);
    }

    // Check if the selected date is within the interval (inclusive)
    return isWithinInterval(selectedDateStart, { start: startDate, end: endDate });
  }, []); // Empty dependency array as it uses only its arguments

  // --- Derived Data for Views ---

  // Activities filtered by status/client/collab AND for the specific selectedDate (for Day View)
  const activitiesForSelectedDate = useMemo(() => {
    return activities.filter(activity =>
        statusFilter.includes(activity.status) &&
        (!selectedClient || activity.clientId === selectedClient) &&
        (!selectedCollaborator || (activity.assignedTo || []).includes(selectedCollaborator)) &&
        isActivityActiveOnDate(activity, selectedDate) // Apply date check here
    );
  }, [activities, selectedDate, statusFilter, selectedClient, selectedCollaborator, isActivityActiveOnDate]);

  // Activities filtered by status/client/collab (used as base for Month and Week View rendering)
  const baseFilteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const passesStatusFilter = statusFilter.length === 0 || statusFilter.includes(activity.status);
      const passesClientFilter = !selectedClient || activity.clientId === selectedClient;
      const passesCollabFilter = !selectedCollaborator || (activity.assignedTo || []).includes(selectedCollaborator);
      return passesStatusFilter && passesClientFilter && passesCollabFilter;
    });
  }, [activities, statusFilter, selectedClient, selectedCollaborator]);

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
    return baseFilteredActivities.filter(activity => {
      // Check if the activity's date range overlaps with the current week's range
      try {
        const activityStart = startOfDay(parseISO(activity.startDate));
        // Use activityStart if endDate is missing or invalid
        let activityEnd = activityStart;
        if (activity.endDate) {
          try {
            activityEnd = startOfDay(parseISO(activity.endDate));
          } catch { /* ignore invalid end date, use start date */}
        }

        // Overlap check: (ActivityStart <= WeekEnd) AND (ActivityEnd >= WeekStart)
        return activityStart <= currentWeekEnd && activityEnd >= currentWeekStart;

      } catch (e) {
        console.warn("Invalid date in activity filter for week view:", activity.id, e);
        return false;
      }
    });
  }, [baseFilteredActivities, currentWeekStart, currentWeekEnd]);


  // --- Navigation and Interaction Handlers ---
  const goToNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(prevDate => addDays(prevDate, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(prevDate => addWeeks(prevDate, 1)); // Navigate by week
    } else { // month
      setDisplayMonth(prevMonth => addMonths(prevMonth, 1));
    }
  };

  const goToPrevious = () => {
    if (viewMode === 'day') {
      setSelectedDate(prevDate => subDays(prevDate, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(prevDate => subWeeks(prevDate, 1)); // Navigate by week
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
      // Optional: switch to day view if selecting from popover while in month/week view
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

  // --- Internal Month Navigation Handler (keep for month view calendar) ---
  const handleInternalMonthChange = (newMonth: Date) => {
    setDisplayMonth(newMonth);
  };

  // --- Combobox Options ---
  const clientOptions = useMemo(() => clients.map(client => ({
    value: client.id,
    label: client.name || (client as any).companyName || 'Cliente sem nome' // Handle potential name variations
  })), [clients]);

  const collaboratorOptions = useMemo(() => loadingCollaborators
      ? [] // Show empty or a loading indicator if needed
      : collaborators.map(collaborator => ({
        value: collaborator.uid,
        label: collaborator.name || collaborator.email || 'Colaborador sem nome'
      })), [collaborators, loadingCollaborators]);

  // --- Helper Functions for Names ---
  const getClientName = useCallback((clientId: string): string | undefined => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || (client as any)?.companyName;
  }, [clients]);

  const getCollaboratorNames = useCallback((assignedToIds: string[] | undefined): string[] => {
    if (!assignedToIds || assignedToIds.length === 0) return [];
    return assignedToIds
        .map(id => {
          const collaborator = collaborators.find(col => col.uid === id);
          return collaborator?.name || collaborator?.email; // Fallback to email if name is missing
        })
        .filter((name): name is string => !!name); // Filter out undefined/null results
  }, [collaborators]);

  // --- Internal Component for Month View Day Cell Content ---
  const CustomDayContent = useCallback((props: DayContentProps) => {
    const { date, displayMonth: currentDisplayMonth } = props; // Renamed to avoid conflict

    // Use baseFilteredActivities and check for *this specific day*
    const dayActivities = baseFilteredActivities.filter(activity =>
        isActivityActiveOnDate(activity, date) // Reuse date check logic
    );

    const isOutside = date.getMonth() !== currentDisplayMonth.getMonth();

    return (
        <div className={cn(
            "flex flex-col items-start h-full w-full relative p-1", // Add padding here
            isOutside && "opacity-50 pointer-events-none"
        )}>
          {/* Day Number */}
          <span className={cn(
              "self-end text-xs font-medium mb-1", // Position top-right
              isSameDay(date, new Date()) && "text-primary font-bold" // Highlight today's number
          )}>
            {format(date, 'd')}
          </span>

          {/* Activity Badges Container */}
          <div className="flex-grow space-y-1 overflow-hidden w-full">
            {loading ? ( // Show skeleton based on the main loading state
                <>
                  <Skeleton className="h-4 w-full rounded-sm mt-1" />
                  <Skeleton className="h-4 w-3/4 rounded-sm mt-1" />
                </>
            ) : (
                <>
                  {dayActivities.slice(0, 2).map(activity => ( // Limit visible badges
                      <Badge
                          key={activity.id}
                          variant={ // Example variant logic based on your Badge component
                            activity.priority === 'high' ? 'destructive' :
                                activity.status === 'completed' ? 'outline' :
                                    'secondary'
                          }
                          className="text-[10px] p-0.5 px-1 leading-tight truncate block w-full font-normal cursor-pointer hover:opacity-80"
                          title={activity.title}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent day click
                            navigate(`/activities/${activity.id}`);
                          }}
                      >
                        {activity.title}
                      </Badge>
                  ))}
                  {dayActivities.length > 2 && ( // Indicator for more activities
                      <Badge
                          variant="outline"
                          className="text-[10px] p-0.5 px-1 leading-tight block w-full font-normal text-muted-foreground"
                      >
                        +{dayActivities.length - 2} mais
                      </Badge>
                  )}
                </>
            )}
          </div>
        </div>
    );
  }, [baseFilteredActivities, isActivityActiveOnDate, loading, navigate]); // Depend on baseFilteredActivities

  // --- Component Rendering ---
  return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Agenda de Atividades</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie as atividades.
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4 relative">

          {/* Left Column: Date/View Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Picker Popover - Always available, but content might adapt */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 w-full sm:w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="h-4 w-4" />
                  {/* Show selected date or week range based on view */}
                  <span>
                    {viewMode === 'week'
                        ? `Semana: ${format(currentWeekStart, 'dd/MM')} - ${format(currentWeekEnd, 'dd/MM/yy', { locale: pt })}`
                        : format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })
                    }
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelectPopover}
                    className={cn("p-3 pointer-events-auto")}
                    locale={pt}
                    initialFocus
                    month={displayMonth} // Controlled month for the popover
                    onMonthChange={setDisplayMonth} // Allow navigation within popover
                />
              </PopoverContent>
            </Popover>


            {/* External Navigation Buttons (Adaptive Label) */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevious} aria-label={viewMode === 'day' ? "Dia anterior" : viewMode === 'week' ? "Semana anterior" : "Mês anterior"}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext} aria-label={viewMode === 'day' ? "Próximo dia" : viewMode === 'week' ? "Próxima semana" : "Próximo mês"}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day/Week/Month Toggle Buttons */}
            <div className="flex items-center gap-1 rounded-md border bg-muted p-0.5">
              <Button
                  variant={viewMode === 'day' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="px-3 h-8"
                  onClick={() => setViewMode('day')}
              >
                Dia
              </Button>
              {/* WEEK Button */}
              <Button
                  variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="px-3 h-8"
                  onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="px-3 h-8"
                  onClick={() => setViewMode('month')}
              >
                Mês
              </Button>
            </div>
          </div>

          {/* Right Column: Filters */}
          <div className="flex flex-col items-end gap-2 w-full md:w-auto md:max-w-[600px]"> {/* Group filters */}
            <div className="flex flex-wrap justify-end items-center gap-3 w-full">
              {/* Collaborator Filter */}
              <div className="flex items-center gap-2 w-full sm:w-[200px] md:w-auto flex-grow md:flex-grow-0">
                <UserRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Combobox options={collaboratorOptions} selectedValue={selectedCollaborator} onSelect={setSelectedCollaborator} placeholder="Colaborador" searchPlaceholder="Buscar..." noResultsText={loadingCollaborators ? "Carregando..." : "Nenhum"} allowClear={true} disabled={loadingCollaborators} className="w-full md:w-[180px]" /> {/* Adjusted width slightly */}
              </div>
              {/* Client Filter */}
              <div className="flex items-center gap-2 w-full sm:w-[200px] md:w-auto flex-grow md:flex-grow-0">
                <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Combobox options={clientOptions} selectedValue={selectedClient} onSelect={setSelectedClient} placeholder="Cliente" searchPlaceholder="Buscar..." noResultsText="Nenhum" allowClear={true} disabled={loading} className="w-full md:w-[180px]" /> {/* Adjusted width slightly */}
              </div>
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 w-auto justify-center flex-shrink-0">
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
            </div>
            {/* Reset Filters Button */}
            <Button variant="link" onClick={resetFilters} className="whitespace-nowrap w-auto justify-end text-muted-foreground hover:text-foreground h-auto p-0 text-sm self-end mt-1">
              Limpar filtros
            </Button>
          </div>
        </div>

        {/* --- Activity Display Area (Conditional) --- */}
        <div className="mt-6">
          {viewMode === 'day' ? (
              // --- Daily View ---
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                  Atividades para {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
                </h2>
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
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {activitiesForSelectedDate.map((activity) => {
                        const clientName = getClientName(activity.clientId);
                        const collaboratorNames = getCollaboratorNames(activity.assignedTo);
                        return (
                            <Card
                                key={activity.id}
                                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between border-2 border-[#8AB4E1]" // Added explicit border color
                                onClick={() => navigate(`/activities/${activity.id}`)}
                                role="button" tabIndex={0} aria-label={`Ver detalhes da atividade ${activity.title}`}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/activities/${activity.id}`); }}
                            >
                              <div> {/* Wrapper for content except footer */}
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-lg font-semibold">{activity.title}</CardTitle>
                                    <Badge variant={activity.priority === 'high' ? 'destructive' : activity.priority === 'medium' ? 'default' : 'secondary'} className="flex-shrink-0 capitalize">
                                      {activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Média' : 'Baixa'}
                                    </Badge>
                                  </div>
                                  <CardDescription className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Clock className="h-3 w-3 flex-shrink-0" />
                                    <span className="whitespace-nowrap">
                                      {(() => { try { const start = parseISO(activity.startDate); const end = activity.endDate ? parseISO(activity.endDate) : null; let dateString = format(start, 'dd/MM/yy HH:mm', { locale: pt }); if (end) { if (isSameDay(start, end)) { dateString += ` - ${format(end, 'HH:mm', { locale: pt })}`; } else { dateString += ` - ${format(end, 'dd/MM/yy HH:mm', { locale: pt })}`; } } return dateString; } catch (e) { console.warn("Invalid date formatting:", activity.id, e); return "Data inválida"; } })()}
                                    </span>
                                  </CardDescription>
                                  <Badge className="mt-2 w-fit" variant={ activity.status === 'completed' ? 'outline' : activity.status === 'pending' ? 'secondary' : activity.status === 'cancelled' ? 'destructive' : 'default' }>
                                    {statusOptions.find(opt => opt.value === activity.status)?.label || activity.status}
                                  </Badge>
                                </CardHeader>
                                <CardContent className="pb-3 pt-1">
                                  <p className="line-clamp-2 text-sm text-muted-foreground">
                                    {activity.description || <span className="italic">Sem descrição</span>}
                                  </p>
                                </CardContent>
                              </div>
                              <CardFooter className="pt-2 pb-3 border-t mt-auto flex flex-wrap gap-2 items-center">
                                {activity.type && <Badge variant="outline" className="text-xs">{activity.type}</Badge>}
                                {clientName && (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1 max-w-[150px] sm:max-w-[200px]">
                                      <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="truncate" title={clientName}>{clientName}</span>
                                    </Badge>
                                )}
                                {collaboratorNames.length > 0 && (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1 max-w-[150px] sm:max-w-[200px]">
                                      <UserRound className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="truncate" title={collaboratorNames.join(', ')}>{collaboratorNames.join(', ')}</span>
                                    </Badge>
                                )}
                                {loadingCollaborators && (activity.assignedTo?.length ?? 0) > 0 && collaboratorNames.length === 0 && (
                                    <Skeleton className="h-5 w-20 rounded-md" />
                                )}
                              </CardFooter>
                            </Card>
                        );
                      })}
                    </div>
                    // Data Loaded - No Activities
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg bg-muted/30 text-center">
                      <p className="text-lg font-medium text-muted-foreground mb-2">Nenhuma atividade encontrada.</p>
                      <p className="text-sm text-muted-foreground mb-4">Não há atividades para {format(selectedDate, "dd 'de' MMMM", { locale: pt })} com os filtros selecionados.</p>
                      <Button variant="default" size="sm" onClick={() => navigate('/activities/new')} className="mt-2">
                        Criar nova atividade
                      </Button>
                      <Button variant="link" size="sm" onClick={resetFilters} className="mt-1 text-xs">
                        Limpar filtros e tentar novamente
                      </Button>
                    </div>
                )}
              </div>
          ) : viewMode === 'month' ? (
              // --- Monthly View ---
              <div className="border rounded-lg overflow-hidden">
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
          ) : viewMode === 'week' ? (
              // --- Weekly View ---
              <div className="space-y-4">
                {/* Week Header */}
                <h2 className="text-xl font-semibold">
                  Semana de {format(currentWeekStart, 'dd/MMM', { locale: pt })} a {format(currentWeekEnd, 'dd/MMM yyyy', { locale: pt })}
                </h2>

                {/* Weekly Grid Wrapper */}
                <div className="grid grid-cols-1 md:grid-cols-7 border rounded-lg overflow-hidden bg-card"> {/* Use bg-card for consistency */}
                  {weekDays.map((day, index) => {
                    // Filter pre-filtered week activities for THIS specific day
                    const activitiesForDay = activitiesForCurrentWeekView.filter(activity =>
                        isActivityActiveOnDate(activity, day) // Reuse the check function
                    );

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "flex flex-col border-b md:border-b-0 md:border-r p-2 min-h-[200px] border-border/50", // Use theme border color
                                index === 6 && "md:border-r-0", // Remove last border
                                isSameDay(day, new Date()) && "bg-blue-50 dark:bg-blue-900/30", // Today highlight
                                isSameDay(day, selectedDate) && !isSameDay(day, new Date()) && "bg-accent/50", // Selected day highlight (if not today)
                            )}
                        >
                          {/* Day Header */}
                          <div className="text-center font-medium text-sm mb-2 pb-1 border-b border-border/30">
                            <span className="block capitalize text-muted-foreground">{format(day, 'EEE', { locale: pt })}</span> {/* Seg, Ter... */}
                            <span className={cn(
                                "block text-lg font-semibold", // Larger day number
                                isSameDay(day, new Date()) && "text-primary" // Highlight today's number color
                            )}>
                                            {format(day, 'd')} {/* 15, 16... */}
                                        </span>
                          </div>

                          {/* Activities List for the Day (Scrollable) */}
                          <div className="space-y-1.5 flex-grow overflow-y-auto overflow-x-hidden py-1"> {/* ADDED overflow-x-hidden */}
                            {loading ? (
                                // Skeletons matching Badge size
                                <>
                                  <Skeleton className="h-8 w-full rounded-md" />
                                  <Skeleton className="h-8 w-3/4 rounded-md mt-1.5" />
                                </>
                            ) : activitiesForDay.length > 0 ? (
                                activitiesForDay.map(activity => (
                                    // Use Badge component for activities
                                    <Badge
                                        key={activity.id}
                                        variant={ // Map status/priority to Badge variants
                                          activity.priority === 'high' ? 'destructive' :
                                              activity.status === 'completed' ? 'outline' :
                                                  activity.status === 'in-progress' ? 'default' : // Example: Use default (primary) for in-progress
                                                      'secondary' // Fallback for pending, cancelled, etc.
                                        }
                                        className={cn(
                                            "text-[11px] p-1 px-1.5 leading-tight block w-full font-normal cursor-pointer hover:opacity-80 text-left h-auto whitespace-normal rounded-md", // Adjusted styles
                                            "transition-all duration-150 ease-in-out hover:scale-[1.02]" // Subtle hover effect
                                        )}
                                        title={activity.title}
                                        onClick={() => navigate(`/activities/${activity.id}`)}
                                        role="button" // Accessibility
                                        tabIndex={0}   // Accessibility
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/activities/${activity.id}`); }} // Accessibility
                                    >
                                      {/* Content inside the Badge */}
                                      <span className="font-semibold block truncate">{activity.title}</span>
                                      <span className="text-xs block opacity-80"> {/* Display time */}
                                        {(() => {
                                          try {
                                            const start = parseISO(activity.startDate);
                                            let timeString = format(start, 'HH:mm', { locale: pt });
                                            if (activity.endDate) {
                                              const end = parseISO(activity.endDate);
                                              // Show end time only if different from start time on the same day
                                              if (!isSameDay(start, end) || format(start, 'HH:mm') !== format(end, 'HH:mm')) {
                                                timeString += ` - ${format(end, 'HH:mm', { locale: pt })}`;
                                              }
                                              // Indicate if it spans multiple days within the view (optional)
                                              // if (!isSameDay(start, end)) timeString += ' (...)';
                                            }
                                            return timeString;
                                          } catch { return 'Horário inválido' }
                                        })()}
                                                    </span>
                                    </Badge>
                                ))
                            ) : (
                                // Message for empty day
                                <div className="flex-grow flex items-center justify-center h-full">
                                  <p className="text-xs text-muted-foreground italic text-center">--</p>
                                </div>
                            )}
                          </div>
                        </div>
                    );
                  })}
                </div>

                {/* Message if no activities found for the entire week with current filters */}
                {!loading && activitiesForCurrentWeekView.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg bg-muted/30 text-center">
                      <p className="text-lg font-medium text-muted-foreground mb-2">Nenhuma atividade encontrada.</p>
                      <p className="text-sm text-muted-foreground mb-4">Não há atividades para a semana de {format(currentWeekStart, "dd/MM", { locale: pt })} a {format(currentWeekEnd, "dd/MM", { locale: pt })} com os filtros selecionados.</p>
                      <Button variant="default" size="sm" onClick={() => navigate('/activities/new')} className="mt-2">
                        Criar nova atividade
                      </Button>
                      <Button variant="link" size="sm" onClick={resetFilters} className="mt-1 text-xs">
                        Limpar filtros e tentar novamente
                      </Button>
                    </div>
                )}
              </div>
          ) : null} {/* End of viewMode conditional rendering */}
        </div>
      </div>
  );
};

export default Home;