
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';
import { db } from '@/lib/firebase';

export type UserRole = 'admin' | 'manager' | 'collaborator';
export type CollaboratorStatus = 'active' | 'inactive' | 'pending';

export interface UserData {
  name: string;
  role: UserRole;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  admissionDate: string;
  active: boolean;
  status?: CollaboratorStatus;  // Add status property
  photoURL?: string;            // Add photoURL property
  createdAt?: string;           // Add createdAt property
  updatedAt?: string;           // Add updatedAt property
  uid?: string;                 // Add uid property
}

// Função para criar um novo usuário (colaborador)
export const createUser = async (
  email: string, 
  password: string, 
  userData: Omit<UserData, 'email'>
) => {
  try {
    // Criar o usuário no Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Atualizar o perfil com o nome do usuário
    await updateProfile(user, {
      displayName: userData.name,
    });
    
    // Salvar dados adicionais no Realtime Database
    await set(ref(db, `users/${user.uid}`), {
      ...userData,
      email,
      uid: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return user;
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
};

// Função para fazer login
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    throw error;
  }
};

// Função para fazer logout
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
};

// Função para obter dados do usuário atual
export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserData;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    throw error;
  }
};

// Função para obter todos os usuários ativos
export const getAllActiveUsers = async (): Promise<(UserData & { uid: string })[]> => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const usersData = snapshot.val();
      const users: (UserData & { uid: string })[] = [];
      
      Object.entries(usersData).forEach(([uid, userData]) => {
        const user = userData as UserData;
        if (user.active) {
          users.push({ ...user, uid });
        }
      });
      
      return users;
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao obter lista de usuários:', error);
    throw error;
  }
};
