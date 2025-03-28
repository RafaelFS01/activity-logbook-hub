
import { firestore } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

const collaboratorsCollection = collection(firestore, "collaborators");

// Tipo para colaborador
export type Collaborator = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "collaborator";
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type CollaboratorFormData = Omit<Collaborator, "id" | "createdAt" | "updatedAt" | "createdBy">;

/**
 * Cria um novo colaborador
 */
export const createCollaborator = async (data: CollaboratorFormData, password: string): Promise<Collaborator> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    // Criar usuário de autenticação
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, password);
    const uid = userCredential.user.uid;
    
    const collaboratorData = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || "",
      uid: uid,
    };
    
    const docRef = await addDoc(collaboratorsCollection, collaboratorData);
    const newCollaborator = { id: docRef.id, ...collaboratorData } as Collaborator;
    
    return newCollaborator;
  } catch (error) {
    console.error("Erro ao criar colaborador:", error);
    throw error;
  }
};

/**
 * Atualiza um colaborador existente
 */
export const updateCollaborator = async (data: { id: string } & Partial<Omit<Collaborator, "id" | "createdAt" | "createdBy">>): Promise<Collaborator> => {
  try {
    const collaboratorRef = doc(collaboratorsCollection, data.id);
    const collaboratorDoc = await getDoc(collaboratorRef);
    
    if (!collaboratorDoc.exists()) {
      throw new Error(`Colaborador com ID ${data.id} não encontrado`);
    }
    
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    delete updateData.id;
    
    await updateDoc(collaboratorRef, updateData);
    
    const updatedCollaborator = await getCollaborator(data.id);
    return updatedCollaborator;
  } catch (error) {
    console.error("Erro ao atualizar colaborador:", error);
    throw error;
  }
};

/**
 * Busca todos os colaboradores
 */
export const getCollaborators = async (): Promise<Collaborator[]> => {
  try {
    const querySnapshot = await getDocs(collaboratorsCollection);
    const collaborators = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Collaborator[];
    
    return collaborators;
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    throw error;
  }
};

/**
 * Busca um colaborador pelo ID
 */
export const getCollaborator = async (id: string): Promise<Collaborator> => {
  try {
    const collaboratorRef = doc(collaboratorsCollection, id);
    const collaboratorDoc = await getDoc(collaboratorRef);
    
    if (!collaboratorDoc.exists()) {
      throw new Error(`Colaborador com ID ${id} não encontrado`);
    }
    
    return { id: collaboratorDoc.id, ...collaboratorDoc.data() } as Collaborator;
  } catch (error) {
    console.error("Erro ao buscar colaborador:", error);
    throw error;
  }
};

/**
 * Exclui um colaborador
 */
export const deleteCollaborator = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(collaboratorsCollection, id));
    return true;
  } catch (error) {
    console.error("Erro ao excluir colaborador:", error);
    throw error;
  }
};

/**
 * Envia email para redefinição de senha
 */
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    const auth = getAuth();
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Erro ao enviar email de redefinição de senha:", error);
    throw error;
  }
};

/**
 * Busca colaboradores por status
 */
export const getCollaboratorsByStatus = async (status: "active" | "inactive"): Promise<Collaborator[]> => {
  try {
    const q = query(collaboratorsCollection, where("status", "==", status));
    const querySnapshot = await getDocs(q);
    
    const collaborators = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Collaborator[];
    
    return collaborators;
  } catch (error) {
    console.error("Erro ao buscar colaboradores por status:", error);
    throw error;
  }
};
