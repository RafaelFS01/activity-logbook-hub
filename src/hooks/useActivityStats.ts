import { useState, useEffect } from 'react';
import { getActivities, Activity, ActivityStatus } from '@/services/firebase/activities';
import {
  format,
  isToday,
  isThisWeek,
  isThisMonth,
  isPast,
  startOfDay,
  startOfToday, // Importar
  startOfWeek, // Importar
  endOfWeek, // Importar
  startOfMonth, // Importar
  endOfMonth, // Importar
  isWithinInterval, // Importar
  isBefore, // Importar
  isAfter, // Importar
  isEqual // Importar
} from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Importar locale para startOfWeek/endOfWeek

export type ActivityStats = {
  total: number;
  completed: number;
  inProgress: number;
  future: number;
  pending: number;
  cancelled: number;
  overdue: number;
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
    if (!activity.startDate) return false;
    try {
      const startDate = startOfDay(new Date(activity.startDate));
      const today = startOfDay(new Date());
      return isAfter(startDate, today); // Usar isAfter
    } catch (e) {
      console.error("Erro ao processar data de início para atividade futura:", activity.startDate, e);
      return false;
    }
  };

  // Função para determinar se uma atividade está atrasada
  const isOverdueActivity = (activity: Activity): boolean => {
    if (!activity.endDate || activity.status === 'completed' || activity.status === 'cancelled') {
      return false;
    }
    try {
      const endDate = startOfDay(new Date(activity.endDate));
      const today = startOfDay(new Date());
      // Atrasada se a data de fim for no passado E o status não for concluída/cancelada
      return isBefore(endDate, today) && (activity.status === 'pending' || activity.status === 'in-progress');
    } catch (e) {
      console.error("Erro ao processar data de fim para atividade atrasada:", activity.endDate, e);
      return false;
    }
  };

  // Função para verificar se o intervalo da atividade se sobrepõe a um período
  const activityOverlapsPeriod = (activity: Activity, periodStart: Date, periodEnd: Date): boolean => {
      if (!activity.startDate) return false; // Atividade sem data de início não se sobrepõe

      try {
          const activityStartDate = new Date(activity.startDate);
          const activityEndDate = activity.endDate ? new Date(activity.endDate) : null;

          // Tratar datas inválidas
          if (isNaN(activityStartDate.getTime())) return false;
          if (activityEndDate && isNaN(activityEndDate.getTime())) return false;

          const periodStartOfDay = startOfDay(periodStart);
          const periodEndOfDay = startOfDay(periodEnd); // Comparar com o início do dia final do período

          // Se a atividade não tem data de fim, ela se sobrepõe se começou antes ou no final do período
          if (!activityEndDate) {
              return !isAfter(startOfDay(activityStartDate), periodEndOfDay);
          }

          const activityStartOfDay = startOfDay(activityStartDate);
          const activityEndOfDay = startOfDay(activityEndDate);

          // A atividade se sobrepõe ao período se:
          // 1. Começa dentro do período OU
          // 2. Termina dentro do período OU
          // 3. Começa antes e termina depois do período
          const startsWithin = isWithinInterval(activityStartOfDay, { start: periodStartOfDay, end: periodEndOfDay }) || isEqual(activityStartOfDay, periodStartOfDay) || isEqual(activityStartOfDay, periodEndOfDay);
          const endsWithin = isWithinInterval(activityEndOfDay, { start: periodStartOfDay, end: periodEndOfDay }) || isEqual(activityEndOfDay, periodStartOfDay) || isEqual(activityEndOfDay, periodEndOfDay);
          const spansPeriod = isBefore(activityStartOfDay, periodStartOfDay) && isAfter(activityEndOfDay, periodEndOfDay);

          return startsWithin || endsWithin || spansPeriod;

      } catch (e) {
          console.error("Erro ao verificar sobreposição de atividade:", activity, e);
          return false;
      }
  };


  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const activities = await getActivities();

        // Definir os intervalos dos períodos
        const today = new Date();
        const startOfTodayDate = startOfToday();
        const startOfThisWeek = startOfWeek(today, { locale: ptBR }); // Usar locale
        const endOfThisWeek = endOfWeek(today, { locale: ptBR }); // Usar locale
        const startOfThisMonth = startOfMonth(today);
        const endOfThisMonth = endOfMonth(today);


        // Inicializar contadores
        const todayStats: ActivityStats = { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 };
        const weekStats: ActivityStats = { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 };
        const monthStats: ActivityStats = { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 };
        const allStats: ActivityStats = { total: 0, completed: 0, inProgress: 0, future: 0, pending: 0, cancelled: 0, overdue: 0 };

        // Processar cada atividade
        activities.forEach(activity => {
          // Estatísticas para todas as atividades (lógica original)
          allStats.total++;
          if (isOverdueActivity(activity)) {
            allStats.overdue++;
          }
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

          // Estatísticas por período (NOVA LÓGICA BASEADA EM INTERVALO)

          // Hoje
          if (activityOverlapsPeriod(activity, startOfTodayDate, startOfTodayDate)) { // Para hoje, o período é apenas o dia
              todayStats.total++;
              if (isOverdueActivity(activity)) todayStats.overdue++;
              if (activity.status === 'completed') todayStats.completed++;
              else if (activity.status === 'in-progress') todayStats.inProgress++;
              else if (activity.status === 'pending' && isFutureActivity(activity)) todayStats.future++;
              else if (activity.status === 'pending') todayStats.pending++;
              else if (activity.status === 'cancelled') todayStats.cancelled++;
          }

          // Esta Semana
          if (activityOverlapsPeriod(activity, startOfThisWeek, endOfThisWeek)) {
              weekStats.total++;
              if (isOverdueActivity(activity)) weekStats.overdue++;
              if (activity.status === 'completed') weekStats.completed++;
              else if (activity.status === 'in-progress') weekStats.inProgress++;
              else if (activity.status === 'pending' && isFutureActivity(activity)) weekStats.future++;
              else if (activity.status === 'pending') weekStats.pending++;
              else if (activity.status === 'cancelled') weekStats.cancelled++;
          }

          // Este Mês
          if (activityOverlapsPeriod(activity, startOfThisMonth, endOfThisMonth)) {
              monthStats.total++;
              if (isOverdueActivity(activity)) monthStats.overdue++;
              if (activity.status === 'completed') monthStats.completed++;
              else if (activity.status === 'in-progress') monthStats.inProgress++;
              else if (activity.status === 'pending' && isFutureActivity(activity)) monthStats.future++;
              else if (activity.status === 'pending') monthStats.pending++;
              else if (activity.status === 'cancelled') monthStats.cancelled++;
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
  }, []); // Dependências vazias, roda apenas na montagem

  return { stats, isLoading, error };
};
