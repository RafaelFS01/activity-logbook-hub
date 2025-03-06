
import { ref, set, get, remove, query, orderByChild, equalTo, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

export type ClientType = 'fisica' | 'juridica';

export interface BaseClientData {
  id: string;
  type: ClientType;
  phone: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // UID do colaborador que criou
}

export interface PessoaFisicaClient extends BaseClientData {
  type: 'fisica';
  fullName: string;
  cpf: string;
}

export interface PessoaJuridicaClient extends BaseClientData {
  type: 'juridica';
  companyName: string;
  cnpj: string;
}

export type Client = PessoaFisicaClient | PessoaJuridicaClient;

// Função para criar um novo cliente
export const createClient = async (
  clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
) => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Criamos o client com base no tipo
    let newClient: Client;
    
    if (clientData.type === 'fisica') {
      const fisicaData = clientData as Omit<PessoaFisicaClient, 'id' | 'createdAt' | 'updatedAt'>;
      newClient = {
        ...fisicaData,
        id,
        createdAt: now,
        updatedAt: now,
        createdBy: userId
      };
    } else {
      const juridicaData = clientData as Omit<PessoaJuridicaClient, 'id' | 'createdAt' | 'updatedAt'>;
      newClient = {
        ...juridicaData,
        id,
        createdAt: now,
        updatedAt: now,
        createdBy: userId
      };
    }
    
    await set(ref(db, `clients/${id}`), newClient);
    return newClient;
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    throw error;
  }
};

// Função para obter todos os clientes
export const getAllClients = async (): Promise<Client[]> => {
  try {
    const clientsRef = ref(db, 'clients');
    const snapshot = await get(clientsRef);
    
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as Client[];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao obter clientes:', error);
    throw error;
  }
};

// Função para obter cliente por ID
export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    const clientRef = ref(db, `clients/${id}`);
    const snapshot = await get(clientRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as Client;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter cliente:', error);
    throw error;
  }
};

// Função para atualizar um cliente
export const updateClient = async (id: string, clientData: Partial<Client>) => {
  try {
    const updates = {
      ...clientData,
      updatedAt: new Date().toISOString()
    };
    
    await update(ref(db, `clients/${id}`), updates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    throw error;
  }
};

// Função para desativar um cliente (exclusão lógica)
export const deactivateClient = async (id: string) => {
  try {
    await update(ref(db, `clients/${id}`), {
      active: false,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Erro ao desativar cliente:', error);
    throw error;
  }
};

// Função para excluir um cliente (apenas para administradores)
export const deleteClient = async (id: string) => {
  try {
    await remove(ref(db, `clients/${id}`));
    return true;
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    throw error;
  }
};

// Função para buscar clientes por tipo
export const getClientsByType = async (type: ClientType): Promise<Client[]> => {
  try {
    const clientsQuery = query(
      ref(db, 'clients'),
      orderByChild('type'),
      equalTo(type)
    );
    
    const snapshot = await get(clientsQuery);
    
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as Client[];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar clientes por tipo:', error);
    throw error;
  }
};
