
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

// Função para aplicar estilo negrito e centralizado às células
const applyCellStyles = (worksheet: XLSX.WorkSheet) => {
  if (!worksheet['!cols']) worksheet['!cols'] = [];
  
  // Aplicar largura de coluna adequada
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let i = 0; i <= range.e.c; ++i) {
    worksheet['!cols'][i] = { width: 20 }; // Largura padrão para colunas
  }
  
  // Estilo para todas as células: centralizado
  const allCellStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
  
  // Estilo para cabeçalho: negrito e centralizado
  const headerStyle = { 
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  
  // Aplicar estilo a todas as células
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);
      
      if (R === 0) {
        // Cabeçalho
        if (!worksheet[cell_ref]) continue;
        worksheet[cell_ref].s = headerStyle;
      } else {
        // Demais células
        if (!worksheet[cell_ref]) continue;
        worksheet[cell_ref].s = allCellStyle;
      }
    }
  }
};

// Adicionar título ao Excel
const addTitleToSheet = (worksheet: XLSX.WorkSheet, title: string) => {
  // Obter a referência atual da planilha
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const numCols = range.e.c + 1;
  
  // Mover todas as células para baixo para dar espaço ao título
  for (let R = range.e.r; R >= 0; --R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const oldCellRef = XLSX.utils.encode_cell({ c: C, r: R });
      const newCellRef = XLSX.utils.encode_cell({ c: C, r: R + 2 });
      
      if (worksheet[oldCellRef]) {
        worksheet[newCellRef] = worksheet[oldCellRef];
        delete worksheet[oldCellRef];
      }
    }
  }
  
  // Inserir o título na primeira linha, mesclar células
  const titleCell = XLSX.utils.encode_cell({ c: 0, r: 0 });
  worksheet[titleCell] = { 
    v: title, 
    t: 's',
    s: { 
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };
  
  // Mesclar células para o título
  if (!worksheet['!merges']) worksheet['!merges'] = [];
  worksheet['!merges'].push({ 
    s: { c: 0, r: 0 }, 
    e: { c: numCols - 1, r: 0 }
  });
  
  // Atualizar a referência da planilha
  worksheet['!ref'] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: range.e.c, r: range.e.r + 2 }
  });
};

// Export activities to Excel
export const exportActivitiesToExcel = (
  activities: (Activity & { clientName?: string })[], 
  filename = 'atividades.xlsx',
  assignees: Record<string, string> = {}
) => {
  const worksheet = XLSX.utils.json_to_sheet(
    activities.map(activity => ({
      'Título': activity.title,
      'Descrição': activity.description,
      'Cliente': activity.clientName || activity.clientId,
      'Responsáveis': activity.assignedTo
        .map(id => assignees[id] || id)
        .join(', '),
      'Status': getActivityStatusText(activity.status),
      'Prioridade': getActivityPriorityText(activity.priority),
      'Data de Início': formatDate(activity.startDate),
      'Data de Término': formatDate(activity.endDate),
      'Data de Conclusão': formatDate(activity.completedDate),
      'Criado em': formatDate(activity.createdAt),
      'Atualizado em': formatDate(activity.updatedAt)
    }))
  );

  // Aplicar estilos
  applyCellStyles(worksheet);
  
  // Adicionar título
  addTitleToSheet(worksheet, "ACTIVITY HUB");

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

  // Aplicar estilos
  applyCellStyles(worksheet);
  
  // Adicionar título
  addTitleToSheet(worksheet, "ACTIVITY HUB");

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

  // Aplicar estilos
  applyCellStyles(worksheet);
  
  // Adicionar título
  addTitleToSheet(worksheet, "ACTIVITY HUB");

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Colaboradores');
  XLSX.writeFile(workbook, filename);
};

// Helper function to get human-readable status text
const getActivityStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return 'Futura';
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
