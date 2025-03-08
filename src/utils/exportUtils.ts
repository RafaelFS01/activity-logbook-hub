
import * as XLSX from 'xlsx';
import { Activity } from '@/services/firebase/activities';
import { Client, PessoaFisicaClient, PessoaJuridicaClient } from '@/services/firebase/clients';
import { UserData } from '@/services/firebase/auth';

// Helper function to format date from ISO string to DD/MM/YYYY
const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

// Export activities to Excel
export const exportActivitiesToExcel = (activities: Activity[], filename = 'atividades.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(
    activities.map(activity => ({
      'Título': activity.title,
      'Descrição': activity.description,
      'ID do Cliente': activity.clientId,
      'Status': getActivityStatusText(activity.status),
      'Prioridade': getActivityPriorityText(activity.priority),
      'Data de Início': formatDate(activity.startDate),
      'Data de Término': formatDate(activity.endDate),
      'Data de Conclusão': formatDate(activity.completedDate),
      'Criado em': formatDate(activity.createdAt),
      'Atualizado em': formatDate(activity.updatedAt)
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Atividades');
  XLSX.writeFile(workbook, filename);
};

// Export clients to Excel
export const exportClientsToExcel = (clients: Client[], filename = 'clientes.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(
    clients.map(client => {
      const commonFields = {
        'Nome': client.type === 'juridica' 
          ? (client as PessoaJuridicaClient).companyName 
          : client.name,
        'Email': client.email,
        'Telefone': client.phone,
        'Endereço': client.address || '',
        'Tipo': client.type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física',
        'Status': client.active ? 'Ativo' : 'Inativo',
        'Criado em': formatDate(client.createdAt),
        'Atualizado em': formatDate(client.updatedAt)
      };

      if (client.type === 'fisica') {
        const pessoaFisica = client as PessoaFisicaClient;
        return {
          ...commonFields,
          'CPF': pessoaFisica.cpf,
          'RG': pessoaFisica.rg || '',
        };
      } else {
        const pessoaJuridica = client as PessoaJuridicaClient;
        return {
          ...commonFields,
          'CNPJ': pessoaJuridica.cnpj,
          'Responsável': pessoaJuridica.responsibleName || '',
        };
      }
    })
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
  XLSX.writeFile(workbook, filename);
};

// Export collaborators to Excel
export const exportCollaboratorsToExcel = (collaborators: (UserData & { uid: string; createdAt?: string; updatedAt?: string })[], filename = 'colaboradores.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(
    collaborators.map(collaborator => ({
      'Nome': collaborator.name,
      'Email': collaborator.email,
      'CPF': collaborator.cpf,
      'Telefone': collaborator.phone,
      'Cargo': getRoleText(collaborator.role),
      'Status': collaborator.active ? 'Ativo' : 'Inativo',
      'Data de Admissão': formatDate(collaborator.admissionDate),
      'Criado em': formatDate(collaborator.createdAt || ''),
      'Atualizado em': formatDate(collaborator.updatedAt || '')
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Colaboradores');
  XLSX.writeFile(workbook, filename);
};

// Helper function to get human-readable status text
const getActivityStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'in-progress': return 'Em Progresso';
    case 'completed': return 'Concluída';
    case 'cancelled': return 'Cancelada';
    default: return status;
  }
};

// Helper function to get human-readable priority text
const getActivityPriorityText = (priority: string): string => {
  switch (priority) {
    case 'low': return 'Baixa';
    case 'medium': return 'Média';
    case 'high': return 'Alta';
    default: return priority;
  }
};

// Helper function to get human-readable role text
const getRoleText = (role: string): string => {
  switch (role) {
    case 'admin': return 'Administrador';
    case 'manager': return 'Gerente';
    case 'collaborator': return 'Colaborador';
    default: return role;
  }
};
