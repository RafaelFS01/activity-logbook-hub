import { useState, useEffect } from 'react';
import { getActivities, Activity, ActivityStatus } from '@/services/firebase/activities';
import { format, isToday, isThisWeek, isThisMonth, isPast, startOfDay } from 'date-fns';

export type ActivityStats = {
  total: number;
  completed: number;
  inProgress: number;
  future: number;
  pending: number;
  cancelled: number;
  overdue: number;  // Added for overdue activities
};

export const useActivityStats = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<{
    today: ActivityStats;
    week: ActivityStats;
    month: ActivityStats;
    all: ActivityStats;
  }>({
    today: { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 },
    week: { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 },
    month: { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 },
    all: { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 },
  });

  // Função para determinar se uma atividade é futura
  const isFutureActivity = (activity: Activity): boolean => {
    const startDate = startOfDay(new Date(activity.startDate));
    const today = startOfDay(new Date());
    return startDate > today;
  };
  
  // Função para determinar se uma atividade está atrasada
  const isOverdueActivity = (activity: Activity): boolean => {
    if (!activity.endDate || activity.status === 'completed' || activity.status === 'cancelled') {
      return false;
    }
    
    const endDate = startOfDay(new Date(activity.endDate));
    const today = startOfDay(new Date());
    
    return isPast(endDate) && (activity.status === 'pending' || activity.status === 'in-progress');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const activities = await getActivities();
        
        // Inicializar contadores
        const todayStats: ActivityStats = { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 };
        const weekStats: ActivityStats = { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 };
        const monthStats: ActivityStats = { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 };
        const allStats: ActivityStats = { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 };
        
        // Processar cada atividade
        activities.forEach(activity => {
          const startDate = new Date(activity.startDate);
          
          // Estatísticas para todas as atividades
          allStats.total++;
          
          // Verificar se a atividade está atrasada
          if (isOverdueActivity(activity)) {
            allStats.overdue++;
          }
          
          // Contar por status
          if (activity.status === 'completed') {
            allStats.completed++;
          } else if (activity.status === 'in-progress') {
            allStats.inProgress++;
          } else if (activity.status === 'pending' && isFutureActivity(activity)) {
            allStats.future++;
          } else if (activity.status === 'pending') {
            allStats.pending++;
          } else if (activity.status === 'cancelled') {
            allStats.cancelled++;
          }
          
          // Verificar se é hoje
          if (isToday(startDate)) {
            todayStats.total++;
            
            if (isOverdueActivity(activity)) {
              todayStats.overdue++;
            }
            
            if (activity.status === 'completed') {
              todayStats.completed++;
            } else if (activity.status === 'in-progress') {
              todayStats.inProgress++;
            } else if (activity.status === 'pending' && isFutureActivity(activity)) {
              todayStats.future++;
            } else if (activity.status === 'pending') {
              todayStats.pending++;
            } else if (activity.status === 'cancelled') {
              todayStats.cancelled++;
            }
          }
          
          // Verificar se é esta semana
          if (isThisWeek(startDate)) {
            weekStats.total++;
            
            if (isOverdueActivity(activity)) {
              weekStats.overdue++;
            }
            
            if (activity.status === 'completed') {
              weekStats.completed++;
            } else if (activity.status === 'in-progress') {
              weekStats.inProgress++;
            } else if (activity.status === 'pending' && isFutureActivity(activity)) {
              weekStats.future++;
            } else if (activity.status === 'pending') {
              weekStats.pending++;
            } else if (activity.status === 'cancelled') {
              weekStats.cancelled++;
            }
          }
          
          // Verificar se é este mês
          if (isThisMonth(startDate)) {
            monthStats.total++;
            
            if (isOverdueActivity(activity)) {
              monthStats.overdue++;
            }
            
            if (activity.status === 'completed') {
              monthStats.completed++;
            } else if (activity.status === 'in-progress') {
              monthStats.inProgress++;
            } else if (activity.status === 'pending' && isFutureActivity(activity)) {
              monthStats.future++;
            } else if (activity.status === 'pending') {
              monthStats.pending++;
            } else if (activity.status === 'cancelled') {
              monthStats.cancelled++;
            }
          }
        });
        
        setStats({
          today: todayStats,
          week: weekStats,
          month: monthStats,
          all: allStats,
        });
      } catch (err) {
        console.error('Erro ao buscar estatísticas de atividades:', err);
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  return { stats, isLoading, error };
};
