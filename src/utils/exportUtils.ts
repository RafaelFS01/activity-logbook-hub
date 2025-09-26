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

// Function to apply styles to cells (cabeçalho, zebra, bordas, larguras dinâmicas, autofiltro e congelamento)
const applyCellStyles = (
  worksheet: XLSX.WorkSheet,
  opts?: {
    headerRowIndex?: number;
    zebra?: boolean;
    autofilter?: boolean;
    freezeRows?: number;
    palette?: {
      headerFill?: string;
      zebraFill?: string;
      border?: string;
    }
  }
) => {
  if (!worksheet['!ref']) return; // Sair se a planilha estiver vazia
  if (!worksheet['!cols']) worksheet['!cols'] = [];

  const headerRowIndex = opts?.headerRowIndex ?? 2; // Após título (linha 0) e linha vazia (1)
  const palette = {
    headerFill: opts?.palette?.headerFill || 'FFE8EEF7',
    zebraFill: opts?.palette?.zebraFill || 'FFF7F9FC',
    border: opts?.palette?.border || 'FFDDDDDD'
  };

  // Largura de colunas baseada no maior conteúdo, com mínimos/máximos
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const colWidths: { width: number }[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxLen = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      const cell = worksheet[cellRef];
      if (!cell || cell.v === undefined || cell.v === null) continue;
      const text = String(cell.v);
      maxLen = Math.max(maxLen, text.length);
    }
    const width = Math.min(Math.max(maxLen + 2, 12), 50);
    colWidths[C] = { width };
  }
  worksheet['!cols'] = colWidths;

  // Estilos
  const allCellStyle = {
    alignment: { vertical: 'center', wrapText: true }
  } as any;

  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: palette.headerFill } }
  } as any;

  const borderStyle = {
    top: { style: 'thin', color: { rgb: palette.border } },
    bottom: { style: 'thin', color: { rgb: palette.border } },
    left: { style: 'thin', color: { rgb: palette.border } },
    right: { style: 'thin', color: { rgb: palette.border } }
  } as any;

  // Aplicar estilos em todas as células
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      const cell = worksheet[cellRef];
      if (!cell) continue;
      if (!cell.s) cell.s = {} as any;

      if (R === headerRowIndex) {
        Object.assign(cell.s, headerStyle);
        (cell.s as any).border = borderStyle;
      } else if (R > headerRowIndex) {
        Object.assign(cell.s, allCellStyle);
        (cell.s as any).border = borderStyle;
      }
    }
  }

  // Zebra stripes nas linhas de dados
  if (opts?.zebra) {
    for (let R = headerRowIndex + 1; R <= range.e.r; ++R) {
      if ((R - headerRowIndex) % 2 === 0) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
          const cell = worksheet[cellRef];
          if (!cell) continue;
          if (!cell.s) cell.s = {} as any;
          (cell.s as any).fill = { fgColor: { rgb: palette.zebraFill } };
        }
      }
    }
  }

  // AutoFilter do cabeçalho até a última linha
  if (opts?.autofilter) {
    const startRef = XLSX.utils.encode_cell({ c: range.s.c, r: headerRowIndex });
    const endRef = XLSX.utils.encode_cell({ c: range.e.c, r: range.e.r });
    (worksheet as any)['!autofilter'] = { ref: `${startRef}:${endRef}` };
  }

  // Congelar linhas superiores (título + espaço + cabeçalho)
  if (opts?.freezeRows && opts.freezeRows > 0) {
    (worksheet as any)['!freeze'] = { rows: opts.freezeRows, columns: 0 };
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

  // Converter string → Date para o Excel reconhecer e permitir filtros/ordenação
  const toExcelDate = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? '' : d;
  };

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
    'Data de Início': toExcelDate(activity.startDate),
    'Data de Término': toExcelDate(activity.endDate),
    'Data de Conclusão': toExcelDate(activity.completedDate),
    'Criado em': toExcelDate(activity.createdAt),
    'Atualizado em': toExcelDate(activity.updatedAt)
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
  // Ajustar tipos/formatos das colunas de data e aplicar estilos aprimorados
  if (worksheet['!ref']) {
    const wsRange = XLSX.utils.decode_range(worksheet['!ref']);
    const headerRow = 2; // Após título e linha vazia
    const dateCols = ['Data de Início', 'Data de Término', 'Data de Conclusão', 'Criado em', 'Atualizado em'];
    // Mapear cabeçalhos → índice de coluna
    const headerMap: Record<string, number> = {};
    for (let C = wsRange.s.c; C <= wsRange.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: headerRow });
      const cell = worksheet[cellRef];
      if (cell && typeof cell.v === 'string') headerMap[cell.v] = C;
    }
    // Tipos/formatação
    dateCols.forEach(colName => {
      const colIdx = headerMap[colName];
      if (colIdx === undefined) return;
      for (let R = headerRow + 1; R <= wsRange.e.r; ++R) {
        const cRef = XLSX.utils.encode_cell({ c: colIdx, r: R });
        const c = worksheet[cRef];
        if (!c || !c.v) continue;
        c.t = 'd';
        c.z = (colName === 'Data de Início' || colName === 'Data de Término') ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy';
      }
    });

    applyCellStyles(worksheet, {
      headerRowIndex: headerRow,
      zebra: true,
      autofilter: true,
      freezeRows: 3,
      palette: {
        headerFill: 'FFE8EEF7',
        zebraFill: 'FFF7F9FC',
        border: 'FFDDDDDD'
      }
    });
  }


  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Atividades');
  XLSX.writeFile(workbook, filename);
};

// Utilitário para carregar scripts de CDN no navegador
const loadScript = (url: string) => new Promise<void>((resolve, reject) => {
  if (typeof document === 'undefined') return reject(new Error('Ambiente sem DOM'));
  const existing = document.querySelector(`script[src="${url}"]`) as HTMLScriptElement | null;
  if (existing) return resolve();
  const s = document.createElement('script');
  s.src = url;
  s.async = true;
  s.onload = () => resolve();
  s.onerror = () => reject(new Error(`Falha ao carregar script: ${url}`));
  document.head.appendChild(s);
});

// Garante ExcelJS e FileSaver via CDN, sem dependências no build
const ensureExcelJsGlobals = async () => {
  const w = window as any;
  if (!w.ExcelJS) {
    await loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js');
  }
  if (!w.saveAs) {
    await loadScript('https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js');
  }
  if (!w.ExcelJS || !w.saveAs) throw new Error('ExcelJS ou FileSaver indisponível');
  return { ExcelJS: w.ExcelJS, saveAs: w.saveAs } as { ExcelJS: any; saveAs: (blob: Blob, name: string) => void };
};

// Versão estilizada com ExcelJS (para acabamento visual avançado)
export const exportActivitiesToExcelStyled = async (
  activities: (Activity & { clientName?: string })[],
  filename = 'atividades.xlsx',
  assignees: Record<string, string> = {}
) => {
  try {
    const { ExcelJS, saveAs } = await ensureExcelJsGlobals();

    const toExcelDate = (dateString?: string) => {
      if (!dateString) return undefined;
      const d = new Date(dateString);
      return isNaN(d.getTime()) ? undefined : d;
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Atividades');

    const colors = {
      headerFill: 'FFE8EEF7',
      zebraFill: 'FFF7F9FC',
      border: 'DDDDDD'
    } as const;

    // Título (linha 1)
    worksheet.mergeCells(1, 1, 1, 11);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = 'RELATÓRIO DE ATIVIDADES - ACTIVITY HUB';
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { bold: true, size: 16 };

    // Cabeçalho (linha 3)
    const headers = [
      'Título', 'Descrição', 'Cliente', 'Responsáveis', 'Status',
      'Prioridade', 'Data de Início', 'Data de Término', 'Data de Conclusão',
      'Criado em', 'Atualizado em'
    ];
    worksheet.getRow(3).values = headers;
    worksheet.getRow(3).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerFill } } as any;
      cell.border = {
        top: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } }
      };
    });

    // Dados (a partir da linha 4)
    const startRow = 4;
    activities.forEach((activity, idx) => {
      const assigneeNames = (activity.assignedTo || []).map(id => assignees[id] || id).join(', ');
      const row = worksheet.getRow(startRow + idx);
      row.values = [
        activity.title || '',
        activity.description || '',
        activity.clientName || activity.clientId || 'N/A',
        assigneeNames || 'Ninguém atribuído',
        getActivityStatusText(activity.status),
        getActivityPriorityText(activity.priority),
        toExcelDate(activity.startDate),
        toExcelDate(activity.endDate),
        toExcelDate(activity.completedDate),
        toExcelDate(activity.createdAt),
        toExcelDate(activity.updatedAt)
      ];
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.border } },
          bottom: { style: 'thin', color: { argb: colors.border } },
          left: { style: 'thin', color: { argb: colors.border } },
          right: { style: 'thin', color: { argb: colors.border } }
        };
      });
      if ((idx + 1) % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.zebraFill } } as any;
        });
      }
    });

    // Formatar colunas de data
    const colIndexByHeader: Record<string, number> = {};
    headers.forEach((h, i) => { colIndexByHeader[h] = i + 1; });
    ['Data de Início', 'Data de Término'].forEach(h => worksheet.getColumn(colIndexByHeader[h]).numFmt = 'dd/mm/yyyy hh:mm');
    ['Data de Conclusão', 'Criado em', 'Atualizado em'].forEach(h => worksheet.getColumn(colIndexByHeader[h]).numFmt = 'dd/mm/yyyy');

    // Larguras dinâmicas
    worksheet.columns?.forEach((col) => {
      let max = 10;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value as any;
        const len = v ? String(v).length : 0;
        if (len > max) max = len;
      });
      col.width = Math.min(Math.max(max + 2, 12), 50);
    });

    // Filtros e congelamento
    worksheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: Math.max(3, startRow + activities.length - 1), column: headers.length }
    } as any;
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  } catch (err) {
    console.error('ExcelJS indisponível, usando fallback XLSX simples:', err);
    exportActivitiesToExcel(activities, filename, assignees);
  }
};
// Nova versão estilizada usando ExcelJS (aplica estilos reais, filtros e congelamento)

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