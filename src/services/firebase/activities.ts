
import { ref, set, get, remove, query, orderByChild, equalTo, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

export type ActivityStatus = 'concluded' | 'inProgress' | 'future';

export interface Activity {
  id: string;
  clientId: string;
  startDate: string; // ISO format
  endDate: string;   // ISO format
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  description: string;
  status: ActivityStatus;
  createdBy: string; // UID do colaborador que registrou
  createdAt: string; // ISO format
  updatedAt: string; // ISO format
}

// Função para criar uma nova atividade
export const createActivity = async (
  activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const newActivity: Activity = {
      ...activityData,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    await set(ref(db, `activities/${id}`), newActivity);
    return newActivity;
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    throw error;
  }
};

// Função para obter todas as atividades
export const getAllActivities = async (): Promise<Activity[]> => {
  try {
    const activitiesRef = ref(db, 'activities');
    const snapshot = await get(activitiesRef);
    
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as Activity[];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao obter atividades:', error);
    throw error;
  }
};

// Função para obter atividade por ID
export const getActivityById = async (id: string): Promise<Activity | null> => {
  try {
    const activityRef = ref(db, `activities/${id}`);
    const snapshot = await get(activityRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as Activity;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter atividade:', error);
    throw error;
  }
};

// Função para atualizar uma atividade
export const updateActivity = async (id: string, activityData: Partial<Activity>) => {
  try {
    const updates = {
      ...activityData,
      updatedAt: new Date().toISOString()
    };
    
    await update(ref(db, `activities/${id}`), updates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    throw error;
  }
};

// Função para excluir uma atividade (para gerentes e administradores)
export const deleteActivity = async (id: string) => {
  try {
    await remove(ref(db, `activities/${id}`));
    return true;
  } catch (error) {
    console.error('Erro ao excluir atividade:', error);
    throw error;
  }
};

// Função para buscar atividades por status
export const getActivitiesByStatus = async (status: ActivityStatus): Promise<Activity[]> => {
  try {
    const activitiesQuery = query(
      ref(db, 'activities'),
      orderByChild('status'),
      equalTo(status)
    );
    
    const snapshot = await get(activitiesQuery);
    
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as Activity[];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar atividades por status:', error);
    throw error;
  }
};

// Função para buscar atividades por cliente
export const getActivitiesByClient = async (clientId: string): Promise<Activity[]> => {
  try {
    const activitiesQuery = query(
      ref(db, 'activities'),
      orderByChild('clientId'),
      equalTo(clientId)
    );
    
    const snapshot = await get(activitiesQuery);
    
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as Activity[];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar atividades por cliente:', error);
    throw error;
  }
};

// Função para buscar atividades por colaborador
export const getActivitiesByCollaborator = async (createdBy: string): Promise<Activity[]> => {
  try {
    const activitiesQuery = query(
      ref(db, 'activities'),
      orderByChild('createdBy'),
      equalTo(createdBy)
    );
    
    const snapshot = await get(activitiesQuery);
    
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as Activity[];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar atividades por colaborador:', error);
    throw error;
  }
};
