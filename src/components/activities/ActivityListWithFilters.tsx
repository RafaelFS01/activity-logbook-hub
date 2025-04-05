
import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Briefcase, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity } from '@/services/firebase/activities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivitiesWithTypeFilter } from '@/hooks/useActivitiesWithTypeFilter';
import ActivityTypeFilter from './ActivityTypeFilter';
import ActivityTypeDisplay from '@/pages/activities/ActivityTypeDisplay';

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-blue-500';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge className="bg-yellow-500">Pendente</Badge>;
    case 'in-progress':
      return <Badge className="bg-blue-500">Em Progresso</Badge>;
    case 'completed':
      return <Badge className="bg-green-500">Concluída</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-500">Cancelada</Badge>;
    default:
      return <Badge>Desconhecido</Badge>;
  }
};

const ActivityListWithFilters: React.FC = () => {
  const { 
    activities, 
    isLoading, 
    error, 
    selectedTypeId, 
    setSelectedTypeId 
  } = useActivitiesWithTypeFilter();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  const handleTypeSelect = (typeId: string | null) => {
    setSelectedTypeId(typeId);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Atividades</h2>
        <div className="flex items-center space-x-2">
          <ActivityTypeFilter 
            onTypeSelect={handleTypeSelect} 
            selectedTypeId={selectedTypeId} 
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhuma atividade encontrada.</p>
        </div>
      ) : (
        <>
          {activities.map((activity) => (
            <Link to={`/activities/${activity.id}`} key={activity.id}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-primary">{activity.title}</h3>
                      <div className="flex space-x-2">
                        <div className={`h-3 w-3 rounded-full ${getPriorityColor(activity.priority)}`} 
                          title={`Prioridade ${activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Média' : 'Baixa'}`} />
                        {getStatusBadge(activity.status)}
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground line-clamp-2">{activity.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {activity.typeId && (
                        <ActivityTypeDisplay typeId={activity.typeId} />
                      )}
                    </div>
                    
                    <div className="flex justify-between pt-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <CalendarClock className="mr-1 h-4 w-4" />
                        <span>
                          {format(new Date(activity.startDate), "dd MMM, yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      
                      {activity.endDate && (
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          <span>
                            Até {format(new Date(activity.endDate), "dd MMM, yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </>
      )}
    </div>
  );
};

export default ActivityListWithFilters;
