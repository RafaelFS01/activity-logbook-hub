import * as XLSX from 'xlsx';
// Assegure que os caminhos de importação estão corretos para seu projeto
import { Activity } from '@/services/firebase/activities';
import { Client, PessoaFisicaClient, PessoaJuridicaClient } from '@/services/firebase/clients';
import { UserData } from '@/services/firebase/auth';

// Helper function to format date from ISO string to DD/MM/YYYY
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    // Verifica se a data é válida antes de formatar
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string received:", dateString);
      return '';
    }
    // Usar UTC para evitar problemas de fuso horário na formatação apenas da data
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return ''; // Retorna vazio em caso de erro
  }
};

// Function to apply styles to cells (bold headers, centered content)
const applyCellStyles = (worksheet: XLSX.WorkSheet) => {
  if (!worksheet['!ref']) return; // Sair se a planilha estiver vazia
  if (!worksheet['!cols']) worksheet['!cols'] = [];

  // Set appropriate column width
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const colWidths: { width: number }[] = [];
  // Calcular larguras baseadas no conteúdo (opcional, pode ser fixo)
  // Exemplo simples: Largura fixa por enquanto
  for (let C = range.s.c; C <= range.e.c; ++C) {
    colWidths[C] = { width: 25 }; // Largura um pouco maior
  }
  worksheet['!cols'] = colWidths;


  // Style for all cells: centered vertically, left horizontally (melhor para texto)
  const allCellStyle = {
    alignment: { vertical: 'center', wrapText: true } // Habilita quebra de linha
  };

  // Style for header: bold and centered
  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: "FFFFAA00" } } // Fundo laranja claro para cabeçalho
  };

  // Apply styles to all cells
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);

      if (!worksheet[cell_ref]) continue; // Pula células vazias

      // Garante que a célula tenha um objeto de estilo
      if (!worksheet[cell_ref].s) worksheet[cell_ref].s = {};

      if (R === 0) {
        // Header row
        Object.assign(worksheet[cell_ref].s, headerStyle);
      } else {
        // Data cells
        Object.assign(worksheet[cell_ref].s, allCellStyle);
        // Define tipo como string para evitar problemas com números/datas
        if(worksheet[cell_ref].v !== undefined && worksheet[cell_ref].t !== 'd') {
          worksheet[cell_ref].t = 's';
        }
      }
    }
  }
};

// Add title to Excel sheet
const addTitleToSheet = (worksheet: XLSX.WorkSheet, title: string) => {
  if (!worksheet['!ref']) {
    worksheet['!ref'] = 'A1'; // Define ref inicial se não existir
  }
  // Get current worksheet reference
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const numCols = range.e.c + 1;

  // Move all cells down to make space for title (2 rows)
  for (let R = range.e.r; R >= range.s.r; --R) { // Começa do range.s.r
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const oldCellRef = XLSX.utils.encode_cell({ c: C, r: R });
      const newCellRef = XLSX.utils.encode_cell({ c: C, r: R + 2 }); // Move 2 linhas para baixo

      if (worksheet[oldCellRef]) {
        worksheet[newCellRef] = worksheet[oldCellRef];
        delete worksheet[oldCellRef];
      }
    }
  }

  // Insert title in first row, merge cells
  const titleCellRef = XLSX.utils.encode_cell({ c: 0, r: 0 });
  worksheet[titleCellRef] = {
    v: title,
    t: 's',
    s: {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Merge cells for title
  const merges = worksheet['!merges'] || [];
  merges.push({
    s: { c: 0, r: 0 },
    e: { c: Math.max(0, numCols - 1), r: 0 } // Garante que e.c não seja negativo
  });
  worksheet['!merges'] = merges;

  // Update worksheet reference
  worksheet['!ref'] = XLSX.utils.encode_range({
    s: { c: range.s.c, r: 0 }, // Começa da linha 0
    e: { c: range.e.c, r: range.e.r + 2 } // Termina 2 linhas abaixo
  });
};


// Export activities to Excel
export const exportActivitiesToExcel = (
    // Aceita a propriedade opcional clientName
    activities: (Activity & { clientName?: string })[],
    filename = 'atividades.xlsx',
    assignees: Record<string, string> = {} // Mapa de ID de responsável para Nome
) => {

  const dataForSheet = activities.map(activity => ({
    'Título': activity.title,
    'Descrição': activity.description,
    // --- AQUI ESTÁ A LÓGICA CHAVE ---
    // Usa activity.clientName se existir (passado pela página), senão usa activity.clientId como fallback.
    'Cliente': activity.clientName || activity.clientId || 'N/A', // Adiciona fallback 'N/A'
    'Responsáveis': activity.assignedTo && activity.assignedTo.length > 0
        ? activity.assignedTo
            .map(id => assignees[id] || id) // Usa o mapa de responsáveis
            .join(', ')
        : 'Ninguém atribuído',
    'Status': getActivityStatusText(activity.status),
    'Prioridade': getActivityPriorityText(activity.priority),
    'Data de Início': formatDate(activity.startDate),
    'Data de Término': formatDate(activity.endDate),
    'Data de Conclusão': formatDate(activity.completedDate),
    'Criado em': formatDate(activity.createdAt),
    'Atualizado em': formatDate(activity.updatedAt)
  }));

  // Define a ordem explícita das colunas
  const headerOrder = [
    'Título', 'Descrição', 'Cliente', 'Responsáveis', 'Status',
    'Prioridade', 'Data de Início', 'Data de Término', 'Data de Conclusão',
    'Criado em', 'Atualizado em'
  ];

  const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { header: headerOrder });

  // Add title first, then apply styles
  addTitleToSheet(worksheet, "RELATÓRIO DE ATIVIDADES - ACTIVITY HUB");
  applyCellStyles(worksheet); // Aplica estilos depois de adicionar o título e mover células


  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Atividades');
  XLSX.writeFile(workbook, filename);
};

// Export clients to Excel
export const exportClientsToExcel = (clients: Client[], filename = 'clientes.xlsx') => {

  const dataForSheet = clients.map(client => {
    const commonFields = {
      // ID do Cliente (Adicionado)
      'ID': client.id,
      'Nome/Empresa': client.type === 'juridica'
          ? (client as PessoaJuridicaClient).companyName
          : client.name,
      'Email': client.email || '',
      'Telefone': client.phone || '',
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
        'CPF': pessoaFisica.cpf || '',
        'RG': pessoaFisica.rg || '',
        'CNPJ': '', // Coluna vazia para alinhar
        'Responsável': '' // Coluna vazia para alinhar
      };
    } else {
      const pessoaJuridica = client as PessoaJuridicaClient;
      return {
        ...commonFields,
        'CPF': '', // Coluna vazia para alinhar
        'RG': '', // Coluna vazia para alinhar
        'CNPJ': pessoaJuridica.cnpj || '',
        'Responsável': pessoaJuridica.responsibleName || '',
      };
    }
  });

  // Define a ordem explícita das colunas
  const headerOrder = [
    'ID', 'Nome/Empresa', 'Tipo', 'Status', 'Email', 'Telefone', 'Endereço',
    'CPF', 'RG', 'CNPJ', 'Responsável', 'Criado em', 'Atualizado em'
  ];

  const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { header: headerOrder });

  // Add title first, then apply styles
  addTitleToSheet(worksheet, "RELATÓRIO DE CLIENTES - ACTIVITY HUB");
  applyCellStyles(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
  XLSX.writeFile(workbook, filename);
};

// Export collaborators to Excel
export const exportCollaboratorsToExcel = (collaborators: (UserData & { uid: string; createdAt?: string; updatedAt?: string })[], filename = 'colaboradores.xlsx') => {

  const dataForSheet = collaborators.map(collaborator => ({
    'ID': collaborator.uid, // Adicionado ID
    'Nome': collaborator.name || '',
    'Email': collaborator.email || '',
    'CPF': collaborator.cpf || '',
    'Telefone': collaborator.phone || '',
    'Cargo': getRoleText(collaborator.role),
    'Status': collaborator.active ? 'Ativo' : 'Inativo',
    'Data de Admissão': formatDate(collaborator.admissionDate),
    'Data de Nascimento': formatDate(collaborator.birthDate), // Adicionado Nascimento
    'Criado em': formatDate(collaborator.createdAt || ''),
    'Atualizado em': formatDate(collaborator.updatedAt || '')
  }));

  // Define a ordem explícita das colunas
  const headerOrder = [
    'ID', 'Nome', 'Status', 'Cargo', 'Email', 'Telefone', 'CPF',
    'Data de Admissão', 'Data de Nascimento', 'Criado em', 'Atualizado em'
  ];


  const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { header: headerOrder });

  // Add title first, then apply styles
  addTitleToSheet(worksheet, "RELATÓRIO DE COLABORADORES - ACTIVITY HUB");
  applyCellStyles(worksheet);


  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Colaboradores');
  XLSX.writeFile(workbook, filename);
};

// Helper function to get human-readable status text
export const getActivityStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return 'Futura';
    case 'in-progress': return 'Em Progresso';
    case 'completed': return 'Concluída';
    case 'cancelled': return 'Cancelada';
    default: return status || 'N/A'; // Fallback
  }
};

// Helper function to get human-readable priority text
export const getActivityPriorityText = (priority: string): string => {
  switch (priority) {
    case 'low': return 'Baixa';
    case 'medium': return 'Média';
    case 'high': return 'Alta';
    default: return priority || 'N/A'; // Fallback
  }
};

// Helper function to get human-readable role text
export const getRoleText = (role: string): string => {
  switch (role) {
    case 'admin': return 'Administrador';
    case 'manager': return 'Gerente';
    case 'collaborator': return 'Colaborador';
    default: return role || 'N/A'; // Fallback
  }
};