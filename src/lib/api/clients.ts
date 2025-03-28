
import { createClient as firebaseCreateClient, getClientById, updateClient as firebaseUpdateClient, getClients } from '@/services/firebase/clients';
import { Client } from '@/lib/schemas/client';

// Create a new client
export const createClient = async (data: Omit<Client, 'id'>) => {
  try {
    // Get current user ID from localStorage or context
    const userInfo = localStorage.getItem('userInfo');
    const userId = userInfo ? JSON.parse(userInfo).uid : 'unknown';
    
    return await firebaseCreateClient(data, userId);
  } catch (error: any) {
    console.error('Error creating client:', error);
    throw new Error(error.message || 'Failed to create client');
  }
};

// Get client by ID
export const getClient = async (id: string): Promise<Client> => {
  try {
    const client = await getClientById(id);
    if (!client) {
      throw new Error('Client not found');
    }
    return client;
  } catch (error: any) {
    console.error('Error getting client:', error);
    throw new Error(error.message || 'Failed to get client');
  }
};

// Update client
export const updateClient = async (data: Client) => {
  try {
    const { id, ...clientData } = data;
    if (!id) {
      throw new Error('Client ID is required');
    }
    return await firebaseUpdateClient(id, clientData);
  } catch (error: any) {
    console.error('Error updating client:', error);
    throw new Error(error.message || 'Failed to update client');
  }
};

// Get all clients
export const getAllClients = async (): Promise<Client[]> => {
  try {
    return await getClients();
  } catch (error: any) {
    console.error('Error getting clients:', error);
    throw new Error(error.message || 'Failed to get clients');
  }
};
