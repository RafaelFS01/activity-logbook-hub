
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
  
  // Reset filter when activities change significantly
  useEffect(() => {
    if (!activities || activities.length === 0) {
      setSelectedTypeId(null);
    }
  }, [activities]);
  
  return {
    selectedTypeId,
    setSelectedTypeId,
    filteredActivities
  };
}
