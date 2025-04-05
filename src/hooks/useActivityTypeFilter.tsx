
import { useState, useEffect, useMemo } from 'react';
import { Activity } from '@/services/firebase/activities';

export function useActivityTypeFilter(activities: Activity[] | undefined) {
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  
  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    if (!selectedTypeId) return activities;
    
    return activities.filter(activity => 
      activity.typeId === selectedTypeId
    );
  }, [activities, selectedTypeId]);
  
  return {
    selectedTypeId,
    setSelectedTypeId,
    filteredActivities
  };
}
