import { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { useNavigate } from 'react-router-dom';
import { format, addDays, subDays, startOfDay, isSameDay, isWithinInterval, parseISO, startOfMonth, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { DayContentProps } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Filter, UserRound, Building } from 'lucide-react';

import { getActivities, Activity, ActivityStatus } from '@/services/firebase/activities';
import { getClients, Client } from '@/services/firebase/clients';
import { getCollaboratorById, CollaboratorData } from '@/services/firebase/collaborators';
import { useAuth } from '@/contexts/AuthContext';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar'; // Your styled Calendar component
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

  // --- States ---
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayMonth, setDisplayMonth] = useState<Date>(startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
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
        if (collaborators.length > 0) setLoadingCollaborators(false);
        return;
      }
      try {
        setLoadingCollaborators(true);
        const collaboratorIds = [...new Set(activities.flatMap(activity => activity.assignedTo || []))];
        if (collaboratorIds.length === 0) {
          setLoadingCollaborators(false);
          return;
        }
        const collaboratorPromises = collaboratorIds.map(id => getCollaboratorById(id));
        const collaboratorResults = await Promise.all(collaboratorPromises);
        setCollaborators(collaboratorResults.filter((data): data is CollaboratorData => data !== null));
      } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
        // Consider adding an error toast here if needed
      } finally {
        setLoadingCollaborators(false);
      }
    };
    if (!loading) {
      fetchCollaborators();
    }
  }, [activities, loading, collaborators.length]);

  // Sync displayMonth with selectedDate if needed
  useEffect(() => {
    const targetMonth = startOfMonth(selectedDate);
    if (!isSameDay(targetMonth, displayMonth)) {
      setDisplayMonth(targetMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]); // *** REMOVIDO displayMonth das dependências ***

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
      // If 'in-progress' without end date, show on start day and subsequent days
      if (activity.status === 'in-progress') {
        return isSameDay(startDate, selectedDateStart) || startDate <= selectedDateStart;
      }
      // For other statuses without end date, show only on start day
      return isSameDay(startDate, selectedDateStart);
    }

    let endDate: Date;
    try {
      endDate = startOfDay(parseISO(activity.endDate));
    } catch (e) {
      console.warn("Invalid end date for activity:", activity.id, activity.endDate);
      return false; // Safer to return false if end date is invalid
    }

    // Check if the selected date is within the interval (inclusive)
    return isWithinInterval(selectedDateStart, { start: startDate, end: endDate });
  }, []); // Empty dependency array if it doesn't depend on component state/props directly

  // --- Derived Data for Views ---
  const activitiesForSelectedDate = useMemo(() => {
    return activities.filter(activity =>
        statusFilter.includes(activity.status) &&
        (!selectedClient || activity.clientId === selectedClient) &&
        (!selectedCollaborator || (activity.assignedTo || []).includes(selectedCollaborator)) &&
        isActivityActiveOnDate(activity, selectedDate) // Apply date check here for daily view
    );
  }, [activities, selectedDate, statusFilter, selectedClient, selectedCollaborator, isActivityActiveOnDate]);

  const filteredActivitiesForMonthView = useMemo(() => {
    // Pre-filter activities by status, client, collaborator for the month view rendering
    return activities.filter(activity => {
      const passesStatusFilter = statusFilter.length === 0 || statusFilter.includes(activity.status);
      const passesClientFilter = !selectedClient || activity.clientId === selectedClient;
      const passesCollabFilter = !selectedCollaborator || (activity.assignedTo || []).includes(selectedCollaborator);
      return passesStatusFilter && passesClientFilter && passesCollabFilter;
    });
  }, [activities, statusFilter, selectedClient, selectedCollaborator]);

  // --- Navigation and Interaction Handlers ---
  const goToNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(prevDate => addDays(prevDate, 1));
    } else {
      setDisplayMonth(prevMonth => addMonths(prevMonth, 1));
    }
  };

  const goToPrevious = () => {
    if (viewMode === 'day') {
      setSelectedDate(prevDate => subDays(prevDate, 1));
    } else {
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
      // Optional: switch to day view if selecting from popover while in month view
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

  // --- Debug Handler for Internal Month Navigation ---
  const handleInternalMonthChange = (newMonth: Date) => {
    console.log("Internal Calendar - Month Change Requested:", newMonth); // DEBUG LOG
    setDisplayMonth(newMonth);
  };

  // --- Combobox Options ---
  const clientOptions = useMemo(() => clients.map(client => ({
    value: client.id,
    label: client.name || (client as any).companyName || 'Cliente sem nome'
  })), [clients]);

  const collaboratorOptions = useMemo(() => loadingCollaborators
      ? []
      : collaborators.map(collaborator => ({
        value: collaborator.uid,
        label: collaborator.name || collaborator.email || 'Colaborador sem nome'
      })), [collaborators, loadingCollaborators]);

  // --- Helper Functions for Names ---
  const getClientName = useCallback((clientId: string): string | undefined => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || (client as any)?.companyName;
  }, [clients]);

  const getCollaboratorNames = useCallback((assignedToIds: string[]): string[] => {
    if (!assignedToIds || assignedToIds.length === 0) return [];
    return assignedToIds
        .map(id => {
          const collaborator = collaborators.find(col => col.uid === id);
          return collaborator?.name || collaborator?.email;
        })
        .filter((name): name is string => !!name);
  }, [collaborators]);

  // --- Internal Component for Month View Day Cell Content ---
  const CustomDayContent = useCallback((props: DayContentProps) => {
    const { date, displayMonth } = props;

    // Filter the pre-filtered activities for THIS specific day
    const dayActivities = filteredActivitiesForMonthView.filter(activity =>
        isActivityActiveOnDate(activity, date) // Reuse date/status check logic
    );

    const isOutside = date.getMonth() !== displayMonth.getMonth();

    return (
        <div className={cn(
            "flex flex-col items-start h-full w-full relative p-1", // Add padding here for content
            isOutside && "opacity-50 pointer-events-none" // Style outside days
        )}>
          {/* Day Number */}
          <span className={cn(
              "self-end text-xs font-medium mb-1", // Position top-right within padding
              isSameDay(date, new Date()) && "text-primary font-bold" // Highlight today's number
          )}>
          {format(date, 'd')}
        </span>

          {/* Activity Badges Container */}
          <div className="flex-grow space-y-1 overflow-hidden w-full">
            {/* Show general skeleton if main data is loading */}
            {loading ? (
                <>
                  <Skeleton className="h-4 w-full rounded-sm mt-1" />
                  <Skeleton className="h-4 w-3/4 rounded-sm mt-1" />
                </>
            ) : (
                <>
                  {dayActivities.slice(0, 2).map(activity => ( // Limit to 2 visible badges
                      <Badge
                          key={activity.id}
                          variant={ // Example coloring by priority/status
                            activity.priority === 'high' ? 'destructive' :
                                activity.status === 'completed' ? 'outline' :
                                    'secondary' // Default badge style
                          }
                          className="text-[10px] p-0.5 px-1 leading-tight truncate block w-full font-normal cursor-pointer hover:opacity-80"
                          title={activity.title} // Full title on hover
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent day click when clicking badge
                            navigate(`/activities/${activity.id}`);
                          }}
                      >
                        {activity.title}
                      </Badge>
                  ))}
                  {dayActivities.length > 2 && ( // "+ More" indicator
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredActivitiesForMonthView, isActivityActiveOnDate, loading, navigate]); // Added dependencies


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
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4 relative"> {/* Added relative for absolute positioning of reset button */}

          {/* Left Column: Date/View Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Picker Popover - CONDITIONAL */}
            {viewMode === 'day' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 w-full sm:w-[280px] justify-start text-left font-normal">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelectPopover}
                        className={cn("p-3 pointer-events-auto")} // Style for popover calendar
                        locale={pt}
                        initialFocus
                        month={displayMonth} // Ensure popover opens to the correct month
                        onMonthChange={setDisplayMonth} // Allow navigation within popover
                    />
                  </PopoverContent>
                </Popover>
            )}

            {/* External Navigation Buttons (Adaptive) */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevious} aria-label={viewMode === 'day' ? "Dia anterior" : "Mês anterior"}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext} aria-label={viewMode === 'day' ? "Próximo dia" : "Próximo mês"}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day/Month Toggle Buttons */}
            <div className="flex items-center gap-1 rounded-md border bg-muted p-0.5">
              <Button
                  variant={viewMode === 'day' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="px-3 h-8"
                  onClick={() => setViewMode('day')}
              >
                Dia
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
          <div className="flex flex-col items-end gap-2 w-full md:w-auto md:max-w-[600px]"> {/* Group filters and reset button, limit width */}
            <div className="flex flex-wrap justify-end items-center gap-3 w-full">
              {/* Collaborator Filter */}
              <div className="flex items-center gap-2 w-full sm:w-[200px] md:w-auto flex-grow md:flex-grow-0">
                <UserRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Combobox options={collaboratorOptions} selectedValue={selectedCollaborator} onSelect={setSelectedCollaborator} placeholder="Colaborador" searchPlaceholder="Buscar..." noResultsText={loadingCollaborators ? "Carregando..." : "Nenhum"} allowClear={true} disabled={loadingCollaborators} className="w-full md:w-[450px]" />
              </div>
              {/* Client Filter */}
              <div className="flex items-center gap-2 w-full sm:w-[200px] md:w-auto flex-grow md:flex-grow-0">
                <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Combobox options={clientOptions} selectedValue={selectedClient} onSelect={setSelectedClient} placeholder="Cliente" searchPlaceholder="Buscar..." noResultsText="Nenhum" allowClear={true} disabled={loading} className="w-full md:w-[320px]" />
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
            {/* Reset Filters Button - Positioned below filters */}
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
                        const collaboratorNames = getCollaboratorNames(activity.assignedTo || []);
                        return (
                            <Card
                                key={activity.id}
                                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between"
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
          ) : (
              // --- Monthly View ---
              <div className="border rounded-lg overflow-hidden">
                <Calendar
                    mode="single" // Keep single selection mode
                    selected={selectedDate} // Highlight the selectedDate
                    onSelect={handleDayClickInMonthView} // Click handler for days
                    month={displayMonth} // Controlled month
                    onMonthChange={handleInternalMonthChange} // Use debug handler for internal navigation
                    // onMonthChange={setDisplayMonth} // Use this when debug is done
                    locale={pt}
                    showOutsideDays={true}
                    className="p-0 w-full" // Basic styling
                    classNames={{ // Detailed styling for month layout
                      months: "flex flex-col sm:flex-row p-3", // Add padding around the whole month grid
                      month: "space-y-4 w-full", // Space below caption
                      caption: "flex justify-center pt-1 relative items-center mb-4 text-center", // Centered caption with margin
                      caption_label: "text-lg font-medium",
                      nav: "space-x-1 flex items-center absolute top-1/2 -translate-y-1/2 w-full justify-between px-4", // Nav buttons positioned absolutely within the caption area padding
                      nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 relative"), // Relative positioning for nav buttons themselves
                      nav_button_previous: "left-0", // Position relative to the nav container
                      nav_button_next: "right-0", // Position relative to the nav container
                      table: "w-full border-collapse mt-0", // Table styling
                      head_row: "flex border-b",
                      head_cell: "text-muted-foreground rounded-md w-[calc(100%/7)] justify-center flex font-normal text-sm pb-1 pt-1", // Equal width cells
                      row: "flex w-full mt-0 border-b min-h-[120px]", // Week row styling
                      cell: cn( // Day cell styling
                          "h-auto w-[calc(100%/7)] text-left text-sm p-0 relative", // Equal width, height auto, no internal padding (DayContent handles it)
                          "focus-within:relative focus-within:z-20 border-l first:border-l-0"
                      ),
                      day: cn( // Clickable day area (covers cell)
                          buttonVariants({ variant: "ghost" }),
                          "h-full w-full p-0 absolute top-0 left-0 flex flex-col items-stretch justify-start font-normal aria-selected:opacity-100 rounded-none",
                          "hover:bg-accent/30 focus:z-10 focus:bg-accent/40", // Hover/focus styles
                          "[&:has([aria-selected])]:bg-accent/50" // Background for selected day cell
                      ),
                      day_selected: "bg-primary/10 text-foreground font-semibold focus:bg-primary/20", // Style for the day_selected number itself (if needed, DayContent handles most)
                      day_today: "!bg-transparent", // Remove default today background (DayContent highlights number)
                      day_outside: "day-outside", // Class for outside days (styling handled in DayContent)
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                    components={{
                      DayContent: CustomDayContent // Inject custom day cell content
                    }}
                />
              </div>
          )}
        </div>
      </div>
  );
};

export default Home;