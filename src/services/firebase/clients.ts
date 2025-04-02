
import { db } from '@/lib/firebase';
import { ref, set, get, push, query, orderByChild, remove, update } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

// Define client types
export type ClientType = 'fisica' | 'juridica';

export interface BaseClient {
  id: string;
  name: string;
  type: ClientType;
  email: string;
  phone: string;
  address?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PessoaFisicaClient extends BaseClient {
  type: 'fisica';
  cpf: string;
  rg?: string;
}

export interface PessoaJuridicaClient extends BaseClient {
  type: 'juridica';
  cnpj: string;
  companyName: string;
  responsibleName?: string;
}

export type Client = PessoaFisicaClient | PessoaJuridicaClient;

// Create a new client
export const createClient = async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>, userId: string) => {
  try {
    const clientRef = ref(db, 'clients');
    const newClientRef = push(clientRef);
    const clientId = newClientRef.key;

    if (!clientId) {
      throw new Error('Falha ao gerar ID do cliente');
    }

    // Ensure all required fields are present
    let clientData: Client;

    if (data.type === 'fisica') {
      clientData = {
        ...(data as PessoaFisicaClient),
        id: clientId,
        name: data.name || '', // Ensure name has a default value
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId || 'unknown', // Ensure createdBy has a default value
        active: true
      } as PessoaFisicaClient;
    } else {
      clientData = {
        ...(data as PessoaJuridicaClient),
        id: clientId,
        name: data.companyName || '', // Use companyName as name for juridica
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId || 'unknown', // Ensure createdBy has a default value
        active: true
      } as PessoaJuridicaClient;
    }

    await set(newClientRef, clientData);
    return clientData;
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    throw error;
  }
};

// Get all clients
export const getClients = async (): Promise<Client[]> => {
  try {
    const clientsRef = ref(db, 'clients');
    const snapshot = await get(clientsRef);
    
    if (snapshot.exists()) {
      const clientsData = snapshot.val();
      return Object.values(clientsData) as Client[];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }
};

// Get client by ID
export const getClientById = async (clientId: string): Promise<Client | null> => {
  try {
    const clientRef = ref(db, `clients/${clientId}`);
    const snapshot = await get(clientRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as Client;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    throw error;
  }
};

// Update client
export const updateClient = async (clientId: string, data: Partial<Omit<Client, 'id' | 'createdAt' | 'createdBy'>>) => {
  try {
    const clientRef = ref(db, `clients/${clientId}`);
    
    // Get current client data
    const snapshot = await get(clientRef);
    if (!snapshot.exists()) {
      throw new Error('Cliente não encontrado');
    }
    
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    await update(clientRef, updatedData);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    throw error;
  }
};

// Delete client (or set inactive)
export const deleteClient = async (clientId: string) => {
  try {
    // Instead of deleting, we set the client to inactive
    const clientRef = ref(db, `clients/${clientId}`);
    await update(clientRef, { 
      active: false,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Erro ao desativar cliente:', error);
    throw error;
  }
};
