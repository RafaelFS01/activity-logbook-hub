
import { db } from '@/lib/firebase';
import { ref, set, get, push, remove, update } from 'firebase/database';

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
      // Convert object to array, ensuring we handle the Firebase data structure correctly
      return Object.entries(typesData).map(([id, data]: [string, any]) => ({
        id,
        name: data.name,
        createdAt: data.createdAt
      }));
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
    const typeId = newTypeRef.key as string;
    
    const typeData: ActivityType = {
      id: typeId,
      name,
      createdAt: new Date().toISOString()
    };
    
    // Use update to ensure proper data structure in Firebase
    const updates: Record<string, any> = {};
    updates[typeId] = typeData;
    
    await update(typesRef, updates);
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
