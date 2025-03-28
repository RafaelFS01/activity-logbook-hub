
import { firestore } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { Client, IndividualClient, CompanyClient } from "@/lib/schemas/client";
import { getAuth } from "firebase/auth";

const clientsCollection = collection(firestore, "clients");

/**
 * Cria um novo cliente
 */
export const createClient = async (data: Omit<Client, "id" | "createdAt" | "updatedAt">): Promise<Client> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    const clientData = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || "",
    };
    
    const docRef = await addDoc(clientsCollection, clientData);
    const newClient = { id: docRef.id, ...clientData } as Client;
    
    return newClient;
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    throw error;
  }
};

/**
 * Atualiza um cliente existente
 */
export const updateClient = async (data: { id: string } & Partial<Omit<Client, "id" | "createdAt" | "createdBy">>): Promise<Client> => {
  try {
    const clientRef = doc(clientsCollection, data.id);
    const clientDoc = await getDoc(clientRef);
    
    if (!clientDoc.exists()) {
      throw new Error(`Cliente com ID ${data.id} não encontrado`);
    }
    
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    delete updateData.id;
    
    await updateDoc(clientRef, updateData);
    
    const updatedClient = await getClient(data.id);
    return updatedClient;
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    throw error;
  }
};

/**
 * Busca todos os clientes
 */
export const getClients = async (): Promise<Client[]> => {
  try {
    const querySnapshot = await getDocs(clientsCollection);
    const clients = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];
    
    return clients;
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    throw error;
  }
};

/**
 * Busca um cliente pelo ID
 */
export const getClient = async (id: string): Promise<Client> => {
  try {
    const clientRef = doc(clientsCollection, id);
    const clientDoc = await getDoc(clientRef);
    
    if (!clientDoc.exists()) {
      throw new Error(`Cliente com ID ${id} não encontrado`);
    }
    
    return { id: clientDoc.id, ...clientDoc.data() } as Client;
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    throw error;
  }
};

/**
 * Exclui um cliente
 */
export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(clientsCollection, id));
    return true;
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    throw error;
  }
};

/**
 * Busca clientes por status
 */
export const getClientsByStatus = async (status: "active" | "inactive"): Promise<Client[]> => {
  try {
    const q = query(clientsCollection, where("status", "==", status));
    const querySnapshot = await getDocs(q);
    
    const clients = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];
    
    return clients;
  } catch (error) {
    console.error("Erro ao buscar clientes por status:", error);
    throw error;
  }
};
