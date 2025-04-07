import { db } from '@/lib/firebase';
import { ref, set, get, push, query, orderByChild, remove, update } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

export type ActivityStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type ActivityPriority = 'low' | 'medium' | 'high';

export interface Activity {
  id: string;
  title: string;
  description: string;
  clientId: string;
  assignedTo: string[];
  status: ActivityStatus;
  priority: ActivityPriority;
  startDate: string;
  endDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  type?: string; // Field for activity type
}

// Create a new activity
export const createActivity = async (data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>, userId: string) => {
  try {
    const activitiesRef = ref(db, 'activities');
    const newActivityRef = push(activitiesRef);
    const activityId = newActivityRef.key;
    
    const activityData: Activity = {
      ...data,
      id: activityId || uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId
    };
    
    await set(newActivityRef, activityData);
    return activityData;
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    throw error;
  }
};

// Get all activities
export const getActivities = async (): Promise<Activity[]> => {
  try {
    const activitiesRef = ref(db, 'activities');
    const snapshot = await get(activitiesRef);
    
    if (snapshot.exists()) {
      const activitiesData = snapshot.val();
      return Object.values(activitiesData) as Activity[];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    throw error;
  }
};

// Get activity by ID
export const getActivityById = async (activityId: string): Promise<Activity | null> => {
  try {
    const activityRef = ref(db, `activities/${activityId}`);
    const snapshot = await get(activityRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as Activity;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar atividade:', error);
    throw error;
  }
};

// Get activities by client
export const getActivitiesByClient = async (clientId: string): Promise<Activity[]> => {
  try {
    const activitiesRef = ref(db, 'activities');
    const snapshot = await get(activitiesRef);
    
    if (snapshot.exists()) {
      const activitiesData = snapshot.val();
      const activities = Object.values(activitiesData) as Activity[];
      return activities.filter(activity => activity.clientId === clientId);
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar atividades do cliente:', error);
    throw error;
  }
};

// Get activities by assignee
export const getActivitiesByAssignee = async (userId: string): Promise<Activity[]> => {
  try {
    const activitiesRef = ref(db, 'activities');
    const snapshot = await get(activitiesRef);
    
    if (snapshot.exists()) {
      const activitiesData = snapshot.val();
      const activities = Object.values(activitiesData) as Activity[];
      return activities.filter(activity => activity.assignedTo.includes(userId));
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar atividades do colaborador:', error);
    throw error;
  }
};

// Update activity
export const updateActivity = async (activityId: string, data: Partial<Omit<Activity, 'id' | 'createdAt' | 'createdBy'>>) => {
  try {
    const activityRef = ref(db, `activities/${activityId}`);
    
    // Get current activity data
    const snapshot = await get(activityRef);
    if (!snapshot.exists()) {
      throw new Error('Atividade não encontrada');
    }
    
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    await update(activityRef, updatedData);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    throw error;
  }
};

// Update activity status
export const updateActivityStatus = async (activityId: string, status: ActivityStatus, userId: string) => {
  try {
    const activityRef = ref(db, `activities/${activityId}`);
    
    // Get current activity data
    const snapshot = await get(activityRef);
    if (!snapshot.exists()) {
      throw new Error('Atividade não encontrada');
    }
    
    const updatedData: Partial<Activity> = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    // If status is completed, add completed date and end date if not already set
    if (status === 'completed') {
      const now = new Date().toISOString();
      updatedData.completedDate = now;
      
      // Add endDate if it's not already set
      const activity = snapshot.val() as Activity;
      if (!activity.endDate) {
        updatedData.endDate = now;
      }
    }
    
    await update(activityRef, updatedData);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status da atividade:', error);
    throw error;
  }
};

// Delete (cancel) activity
export const deleteActivity = async (activityId: string) => {
  try {
    const activityRef = ref(db, `activities/${activityId}`);
    
    // Get current activity data
    const snapshot = await get(activityRef);
    if (!snapshot.exists()) {
      throw new Error('Atividade não encontrada');
    }
    
    // Instead of actually deleting, we mark it as cancelled
    await update(activityRef, { 
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao cancelar atividade:', error);
    throw error;
  }
};

// Get all activity types
export const getActivityTypes = async (): Promise<string[]> => {
  try {
    const activitiesRef = ref(db, 'activities');
    const snapshot = await get(activitiesRef);
    
    if (snapshot.exists()) {
      const activitiesData = snapshot.val();
      const activities = Object.values(activitiesData) as Activity[];
      
      // Extract all types, filter out undefined/null, and remove duplicates
      const types = activities
        .map(activity => activity.type)
        .filter(type => type !== undefined && type !== null && type !== '') as string[];
      
      return [...new Set(types)].sort(); // Remove duplicates and sort
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar tipos de atividades:', error);
    throw error;
  }
};
