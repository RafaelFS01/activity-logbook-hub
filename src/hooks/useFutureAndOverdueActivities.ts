import { useState, useEffect } from 'react';
import { getActivities, Activity } from '@/services/firebase/activities';
import { getClientById, Client } from '@/services/firebase/clients';
import { getUserData, UserData } from '@/services/firebase/auth';
import { isPast, startOfDay } from 'date-fns';

export type ActivityWithClientAndAssignees = {
  activity: Activity;
  client: Client | null;
  assignees: (UserData | null)[];
};

// Função para determinar se uma atividade é futura (copiada de useActivityStats)
const isFutureActivity = (activity: Activity): boolean => {
  if (!activity.startDate) return false;
  try {
    const startDate = startOfDay(new Date(activity.startDate));
    const today = startOfDay(new Date());
    return startDate > today;
  } catch (e) {
    console.error("Erro ao processar data de início para atividade futura:", activity.startDate, e);
    return false;
  }
};

// Função para determinar se uma atividade está atrasada (copiada de useActivityStats)
const isOverdueActivity = (activity: Activity): boolean => {
  if (!activity.endDate || activity.status === 'completed' || activity.status === 'cancelled') {
    return false;
  }
  try {
    const endDate = startOfDay(new Date(activity.endDate));
    const today = startOfDay(new Date());
    return isPast(endDate) && (activity.status === 'pending' || activity.status === 'in-progress');
  } catch (e) {
    console.error("Erro ao processar data de fim para atividade atrasada:", activity.endDate, e);
    return false;
  }
};


export const useFutureAndOverdueActivities = (limit: number = 3) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [futureActivities, setFutureActivities] = useState<ActivityWithClientAndAssignees[]>([]);
  const [overdueActivities, setOverdueActivities] = useState<ActivityWithClientAndAssignees[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const activities = await getActivities();

        const future: Activity[] = [];
        const overdue: Activity[] = [];

        // Filtrar atividades futuras e atrasadas
        activities.forEach(activity => {
          if (isFutureActivity(activity)) {
            future.push(activity);
          } else if (isOverdueActivity(activity)) {
            overdue.push(activity);
          }
        });

        // Ordenar atividades futuras (mais próximas primeiro)
        future.sort((a, b) => {
             try {
                const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
                const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
                 // Tratar datas inválidas/ausentes
                const validDateA = isNaN(dateA) ? Infinity : dateA; // Futuras sem data vão para o fim
                const validDateB = isNaN(dateB) ? Infinity : dateB;
                return validDateA - validDateB; // Mais próximas primeiro
             } catch (e) {
                 console.error("Erro na ordenação de atividades futuras:", e);
                 return 0; // Não altera a ordem em caso de erro
             }
        });

        // Ordenar atividades atrasadas (mais antigas primeiro)
         overdue.sort((a, b) => {
             try {
                const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
                const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
                 // Tratar datas inválidas/ausentes
                const validDateA = isNaN(dateA) ? 0 : dateA; // Atrasadas sem data vão para o início (mais antigas)
                const validDateB = isNaN(dateB) ? 0 : dateB;
                return validDateA - validDateB; // Mais antigas primeiro
             } catch (e) {
                 console.error("Erro na ordenação de atividades atrasadas:", e);
                 return 0; // Não altera a ordem em caso de erro
             }
         });


        // Limitar e buscar dados adicionais para atividades futuras
        const limitedFuture = future.slice(0, limit);
        const futureWithData = await Promise.all(
          limitedFuture.map(async (activity) => {
            try {
              const client = await getClientById(activity.clientId);
              const assigneesData = await Promise.all(
                (activity.assignedTo || []).map(async (userId) => {
                  try {
                    return await getUserData(userId);
                  } catch (err) {
                    console.error(`Erro ao buscar colaborador ${userId}:`, err);
                    return null;
                  }
                })
              );
              return {
                activity,
                client,
                assignees: assigneesData
              };
            } catch (err) {
              console.error(`Erro ao buscar dados para atividade futura ${activity.id}:`, err);
              return {
                activity,
                client: null,
                assignees: []
              };
            }
          })
        );
        setFutureActivities(futureWithData);

        // Limitar e buscar dados adicionais para atividades atrasadas
        const limitedOverdue = overdue.slice(0, limit);
         const overdueWithData = await Promise.all(
           limitedOverdue.map(async (activity) => {
             try {
               const client = await getClientById(activity.clientId);
               const assigneesData = await Promise.all(
                 (activity.assignedTo || []).map(async (userId) => {
                   try {
                     return await getUserData(userId);
                   } catch (err) {
                     console.error(`Erro ao buscar colaborador ${userId}:`, err);
                     return null;
                   }
                 })
               );
               return {
                 activity,
                 client,
                 assignees: assigneesData
               };
             } catch (err) {
               console.error(`Erro ao buscar dados para atividade atrasada ${activity.id}:`, err);
               return {
                 activity,
                 client: null,
                 assignees: []
               };
             }
           })
         );
        setOverdueActivities(overdueWithData);


      } catch (err) {
        console.error('Erro ao buscar atividades futuras/atrasadas:', err);
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [limit]); // Depende do limite

  return { futureActivities, overdueActivities, isLoading, error };
};