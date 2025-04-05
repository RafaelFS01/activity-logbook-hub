
import { db } from '@/lib/firebase';
import { ref, set, get, push, remove } from 'firebase/database';

export interface ActivityType {
  id: string;
  name: string;
  createdAt: string;
}

// Get all activity types
export const getActivityTypes = async (): Promise<ActivityType[]> => {
  try {
    const typesRef = ref(db, 'activityTypes');
    const snapshot = await get(typesRef);
    
    if (snapshot.exists()) {
      const typesData = snapshot.val();
      return Object.values(typesData) as ActivityType[];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar tipos de atividade:', error);
    throw error;
  }
};

// Create a new activity type
export const createActivityType = async (name: string): Promise<ActivityType> => {
  try {
    const typesRef = ref(db, 'activityTypes');
    const newTypeRef = push(typesRef);
    const typeId = newTypeRef.key;
    
    const typeData: ActivityType = {
      id: typeId || '',
      name,
      createdAt: new Date().toISOString()
    };
    
    await set(newTypeRef, typeData);
    return typeData;
  } catch (error) {
    console.error('Erro ao criar tipo de atividade:', error);
    throw error;
  }
};

// Delete an activity type
export const deleteActivityType = async (typeId: string): Promise<boolean> => {
  try {
    const typeRef = ref(db, `activityTypes/${typeId}`);
    await remove(typeRef);
    return true;
  } catch (error) {
    console.error('Erro ao excluir tipo de atividade:', error);
    throw error;
  }
};
