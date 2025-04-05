
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getActivities, getActivitiesByAssignee, Activity } from '@/services/firebase/activities';
import { useActivityTypeFilter } from './useActivityTypeFilter';

export function useActivitiesWithTypeFilter() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const { selectedTypeId, setSelectedTypeId, filteredActivities } = useActivityTypeFilter(activities);
  
  useEffect(() => {
    const loadActivities = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        let fetchedActivities: Activity[] = [];
        
        // Collaborators can only see their assigned activities
        if (user.role === 'collaborator') {
          fetchedActivities = await getActivitiesByAssignee(user.uid);
        } else {
          // Admins and managers can see all activities
          fetchedActivities = await getActivities();
        }
        
        // Ordenar por data de criação (mais recente primeiro)
        fetchedActivities.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setActivities(fetchedActivities);
      } catch (err) {
        console.error("Erro ao carregar atividades:", err);
        setError("Não foi possível carregar as atividades.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadActivities();
  }, [user]);
  
  return {
    activities: filteredActivities,
    originalActivities: activities,
    isLoading,
    error,
    selectedTypeId,
    setSelectedTypeId
  };
}
