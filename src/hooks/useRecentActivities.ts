
import { useState, useEffect } from 'react';
import { getActivities, Activity } from '@/services/firebase/activities';
import { getClientById, Client } from '@/services/firebase/clients';
import { getUserData, UserData } from '@/services/firebase/auth';

export type ActivityWithClient = {
  activity: Activity;
  client: Client | null;
  assignees: (UserData | null)[];
};

export const useRecentActivities = (limit: number = 5) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityWithClient[]>([]);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        setIsLoading(true);
        const activities = await getActivities();
        
        // Ordenar atividades por data de criação (mais recentes primeiro)
        const sortedActivities = activities.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // Limitar ao número especificado
        const limitedActivities = sortedActivities.slice(0, limit);
        
        // Buscar informações do cliente e colaboradores para cada atividade
        const activitiesWithData = await Promise.all(
          limitedActivities.map(async (activity) => {
            try {
              // Buscar informações do cliente
              const client = await getClientById(activity.clientId);
              
              // Buscar informações dos colaboradores responsáveis
              const assigneesData = await Promise.all(
                activity.assignedTo.map(async (userId) => {
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
              console.error(`Erro ao buscar dados para atividade ${activity.id}:`, err);
              return { 
                activity, 
                client: null, 
                assignees: [] 
              };
            }
          })
        );
        
        setRecentActivities(activitiesWithData);
      } catch (err) {
        console.error('Erro ao buscar atividades recentes:', err);
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecentActivities();
  }, [limit]);
  
  return { recentActivities, isLoading, error };
};
