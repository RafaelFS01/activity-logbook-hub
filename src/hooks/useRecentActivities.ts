
import { useState, useEffect } from 'react';
import { getActivities, Activity } from '@/services/firebase/activities';
import { getClientById, Client } from '@/services/firebase/clients';

export type ActivityWithClient = {
  activity: Activity;
  client: Client | null;
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
        
        // Buscar informações do cliente para cada atividade
        const activitiesWithClients = await Promise.all(
          limitedActivities.map(async (activity) => {
            try {
              const client = await getClientById(activity.clientId);
              return { activity, client };
            } catch (err) {
              console.error(`Erro ao buscar cliente para atividade ${activity.id}:`, err);
              return { activity, client: null };
            }
          })
        );
        
        setRecentActivities(activitiesWithClients);
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
