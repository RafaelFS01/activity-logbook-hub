
import { db } from '@/lib/firebase';
import { ref, set, get, update } from 'firebase/database';
import { UserData } from './auth';

// Extend the UserData type to include the properties needed for collaborators
export interface CollaboratorData extends UserData {
  status: CollaboratorStatus;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  uid: string;
}

export type CollaboratorStatus = 'active' | 'inactive' | 'pending';

// Get collaborator by ID
export const getCollaboratorById = async (id: string): Promise<CollaboratorData | null> => {
  try {
    const userRef = ref(db, `users/${id}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as CollaboratorData;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter dados do colaborador:', error);
    throw error;
  }
};

// Update collaborator status
export const updateCollaboratorStatus = async (
  id: string, 
  status: CollaboratorStatus, 
  updatedBy: string
) => {
  try {
    const userRef = ref(db, `users/${id}`);
    
    // Check if user exists
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      throw new Error('Colaborador não encontrado');
    }
    
    // Update status
    await update(userRef, {
      status,
      updatedAt: new Date().toISOString(),
      updatedBy
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status do colaborador:', error);
    throw error;
  }
};
