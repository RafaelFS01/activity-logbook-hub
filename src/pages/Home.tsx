
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, subDays, startOfDay, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Filter } from 'lucide-react';
import { getActivities, Activity, ActivityStatus } from '@/services/firebase/activities';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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

  // Status options
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
      } catch (error) {
        console.error('Erro ao buscar atividades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Função para verificar se a atividade está ativa na data selecionada
  const isActivityActiveOnDate = (activity: Activity, date: Date) => {
    if (!statusFilter.includes(activity.status)) {
      return false;
    }

    const startDate = parseISO(activity.startDate);
    
    // Se não há data de término ou está concluída
    if (!activity.endDate) {
      // Para atividades em progresso, elas continuam até hoje
      if (activity.status === 'in-progress') {
        return startDate <= date;
      }
      // Para outras atividades sem data fim, só considere a data de início
      return isSameDay(startDate, date);
    }
    
    // Se tem data de término, verifica se a data selecionada está dentro do intervalo
    const endDate = parseISO(activity.endDate);
    return isWithinInterval(date, { start: startDate, end: endDate });
  };

  // Filtrar atividades para a data selecionada considerando o período
  const activitiesForSelectedDate = activities.filter(activity =>
    isActivityActiveOnDate(activity, selectedDate)
  );

  const goToNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };

  const goToPreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };

  // Handler para alternar status no filtro
  const handleStatusToggle = (status: ActivityStatus) => {
    setStatusFilter(prevFilter => {
      if (prevFilter.includes(status)) {
        return prevFilter.filter(s => s !== status);
      } else {
        return [...prevFilter, status];
      }
    });
  };

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filtrar por status ({statusFilter.length})</span>
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
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Atividades para {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
        </h2>
        
        {loading ? (
          // Loading skeleton
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
          // Display activities
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
