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
  const [loadingCollaborators, setLoadingCollaborators] = useState<boolean>(false);

  const statusOptions: { label: string; value: ActivityStatus }[] = [
    { label: 'Pendente', value: 'pending' },
    { label: 'Em Progresso', value: 'in-progress' },
    { label: 'Concluído', value: 'completed' },
    { label: 'Cancelado', value: 'cancelled' },
  ];

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const allActivities = await getActivities();
        setActivities(allActivities);

        const allClients = await getClients();
        setClients(allClients.filter(client => client.active));
      } catch (error) {
        console.error('Erro ao buscar atividades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (activities.length === 0) return;
      
      try {
        setLoadingCollaborators(true);
        const collaboratorIds = [...new Set(activities.flatMap(activity => activity.assignedTo))];
        
        const collaboratorData = await Promise.all(
          collaboratorIds.map(async (id) => {
            const data = await getCollaboratorById(id);
            return data;
          })
        );
        
        setCollaborators(collaboratorData.filter((data): data is CollaboratorData => data !== null));
      } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
      } finally {
        setLoadingCollaborators(false);
      }
    };

    fetchCollaborators();
  }, [activities]);

  const isActivityActiveOnDate = (activity: Activity, date: Date) => {
    if (!statusFilter.includes(activity.status)) {
      return false;
    }

    if (selectedClient && activity.clientId !== selectedClient) {
      return false;
    }

    if (selectedCollaborator && !activity.assignedTo.includes(selectedCollaborator)) {
      return false;
    }

    const selectedDateStart = startOfDay(date);
    const startDate = startOfDay(parseISO(activity.startDate));
    
    if (!activity.endDate) {
      if (activity.status === 'in-progress') {
        return isSameDay(startDate, selectedDateStart) || startDate <= selectedDateStart;
      }
      return isSameDay(startDate, selectedDateStart);
    }
    
    const endDate = startOfDay(parseISO(activity.endDate));
    return isWithinInterval(selectedDateStart, { start: startDate, end: endDate });
  };

  const activitiesForSelectedDate = activities.filter(activity =>
    isActivityActiveOnDate(activity, selectedDate)
  );

  const goToNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };

  const goToPreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };

  const handleStatusToggle = (status: ActivityStatus) => {
    setStatusFilter(prevFilter => {
      if (prevFilter.includes(status)) {
        return prevFilter.filter(s => s !== status);
      } else {
        return [...prevFilter, status];
      }
    });
  };

  const resetFilters = () => {
    setStatusFilter(['in-progress']);
    setSelectedClient(null);
    setSelectedCollaborator(null);
  };

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  const collaboratorOptions = collaborators.map(collaborator => ({
    value: collaborator.uid,
    label: collaborator.name || collaborator.email || 'Sem nome'
  }));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Agenda de Atividades</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie as atividades para cada dia.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
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
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 w-[250px]">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <Combobox
              options={collaboratorOptions}
              selectedValue={selectedCollaborator}
              onSelect={setSelectedCollaborator}
              placeholder="Filtrar por colaborador"
              searchPlaceholder="Buscar colaborador..."
              noResultsText="Nenhum colaborador encontrado"
              allowClear={true}
              disabled={loadingCollaborators}
            />
          </div>

          <div className="flex items-center gap-2 w-[250px]">
            <Building className="h-4 w-4 text-muted-foreground" />
            <Combobox
              options={clientOptions}
              selectedValue={selectedClient}
              onSelect={setSelectedClient}
              placeholder="Filtrar por cliente"
              searchPlaceholder="Buscar cliente..."
              noResultsText="Nenhum cliente encontrado"
              allowClear={true}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Status ({statusFilter.length})</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background">
              <DropdownMenuLabel>Status da atividade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-2">
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`status-${option.value}`} 
                      checked={statusFilter.includes(option.value)} 
                      onCheckedChange={() => handleStatusToggle(option.value)}
                    />
                    <label 
                      htmlFor={`status-${option.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={resetFilters} className="whitespace-nowrap">
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Atividades para {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
        </h2>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-4 w-1/5" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : activitiesForSelectedDate.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activitiesForSelectedDate.map((activity) => (
              <Card 
                key={activity.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/activities/${activity.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle>{activity.title}</CardTitle>
                    <Badge variant={activity.priority === 'high' ? 'destructive' : activity.priority === 'medium' ? 'default' : 'secondary'}>
                      {activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> 
                    {format(new Date(activity.startDate), 'dd/MM/yyyy HH:mm')}
                    {activity.endDate && ` - ${format(new Date(activity.endDate), 'dd/MM/yyyy HH:mm')}`}
                  </CardDescription>
                  <Badge 
                    className="mt-1" 
                    variant={
                      activity.status === 'completed' ? 'outline' : 
                      activity.status === 'pending' ? 'secondary' : 
                      activity.status === 'cancelled' ? 'destructive' : 
                      'default'
                    }
                  >
                    {activity.status === 'in-progress' ? 'Em progresso' : 
                     activity.status === 'completed' ? 'Concluída' : 
                     activity.status === 'pending' ? 'Pendente' : 'Cancelada'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {activity.description || 'Sem descrição'}
                  </p>
                </CardContent>
                <CardFooter className="pt-1">
                  <Badge variant="outline" className="text-xs">
                    {activity.type || 'Sem tipo'}
                  </Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 border rounded-lg bg-muted/30">
            <p className="text-muted-foreground">Nenhuma atividade encontrada para este dia com os filtros aplicados.</p>
            <Button 
              variant="link" 
              onClick={() => navigate('/activities/new')} 
              className="mt-2"
            >
              Criar nova atividade
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
