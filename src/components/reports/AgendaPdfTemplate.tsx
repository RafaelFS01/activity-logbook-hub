import React, { forwardRef } from 'react';
import { Activity, ActivityStatus, ActivityPriority } from '@/services/firebase/activities';
import { Client, PessoaJuridicaClient } from '@/services/firebase/clients';
import { UserData } from '@/services/firebase/auth';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Interfaces de Props ---
interface AgendaPdfTemplateProps {
  activities: Activity[];
  clients: Client[];
  allUsersData: Record<string, UserData & { uid: string }>;
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'month';
  emissionDate: string;
  filterInfo?: {
    statusFilter: ActivityStatus[];
    selectedClient?: string | null;
    selectedCollaborator?: string | null;
  };
}

// --- Funções Auxiliares ---

/**
 * Formata uma string de data (ISO ou similar) para dd/MM/yyyy.
 */
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (isNaN(date.getTime())) {
      return 'Data Inválida';
    }
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data para PDF:", dateString, error);
    return 'Erro Data';
  }
};

/**
 * Formata data e hora para exibição.
 */
const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (isNaN(date.getTime())) {
      return 'Data Inválida';
    }
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data/hora para PDF:", dateString, error);
    return 'Erro Data';
  }
};

/**
 * Retorna o texto descritivo para o status da atividade.
 */
const getActivityStatusText = (status: ActivityStatus): string => {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'in-progress': return 'Em Andamento';
    case 'completed': return 'Concluída';
    case 'cancelled': return 'Cancelada';
    default: return 'Desconhecido';
  }
};

/**
 * Retorna o texto descritivo para a prioridade da atividade.
 */
const getActivityPriorityText = (priority: ActivityPriority | undefined): string => {
  if (!priority) return 'Não definida';
  switch (priority) {
    case 'low': return 'Baixa';
    case 'medium': return 'Média';
    case 'high': return 'Alta';
    default: return 'Não definida';
  }
};

/**
 * Retorna o nome formatado do cliente.
 */
const getClientName = (clientId: string | undefined, clients: Client[]): string => {
  if (!clientId) return 'Cliente não especificado';
  const client = clients.find(c => c.id === clientId);
  if (!client) return `Cliente ID: ${clientId.substring(0, 6)}...`;
  return client.type === 'juridica'
    ? (client as PessoaJuridicaClient).companyName || client.name || 'Empresa sem nome'
    : client.name || 'Cliente sem nome';
};

/**
 * Retorna os nomes dos colaboradores.
 */
const getCollaboratorNames = (assignedToIds: string[] | undefined, allUsersData: Record<string, UserData & { uid: string }>): string => {
  if (!assignedToIds || assignedToIds.length === 0) return 'Nenhum responsável';
  
  const names = assignedToIds
    .map(id => {
      const collaborator = allUsersData[id];
      return collaborator?.name || collaborator?.email || `ID: ${id.substring(0, 6)}`;
    })
    .filter(name => !!name);
    
  return names.length > 0 ? names.join(', ') : 'Responsáveis não encontrados';
};

// --- Componente AgendaPdfTemplate ---

const AgendaPdfTemplate = forwardRef<HTMLDivElement, AgendaPdfTemplateProps>(
  ({ activities, clients, allUsersData, selectedDate, viewMode, emissionDate, filterInfo }, ref) => {

    const getViewModeTitle = () => {
      switch (viewMode) {
        case 'day':
          return `Agenda do Dia - ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
        case 'week':
          // Para semana, calcular o início e fim da semana
          const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
          return `Agenda da Semana - ${format(weekStart, "dd/MM", { locale: ptBR })} a ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`;
        case 'month':
          return `Agenda do Mês - ${format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}`;
        default:
          return 'Agenda de Atividades';
      }
    };

    const getFilterSummary = () => {
      if (!filterInfo) return '';
      
      const filters = [];
      
      if (filterInfo.statusFilter && filterInfo.statusFilter.length > 0) {
        const statusNames = filterInfo.statusFilter.map(status => getActivityStatusText(status));
        filters.push(`Status: ${statusNames.join(', ')}`);
      }
      
      if (filterInfo.selectedClient) {
        const clientName = getClientName(filterInfo.selectedClient, clients);
        filters.push(`Cliente: ${clientName}`);
      }
      
      if (filterInfo.selectedCollaborator) {
        const collaborator = allUsersData[filterInfo.selectedCollaborator];
        const collaboratorName = collaborator?.name || collaborator?.email || 'Colaborador não encontrado';
        filters.push(`Colaborador: ${collaboratorName}`);
      }
      
      return filters.length > 0 ? filters.join(' | ') : '';
    };

    // Ordenar atividades por data de início
    const sortedActivities = [...activities].sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      
      try {
        const dateA = parseISO(a.startDate).getTime();
        const dateB = parseISO(b.startDate).getTime();
        return dateA - dateB;
      } catch {
        return 0;
      }
    });

    return (
      <div ref={ref} className="pdf-container">
        {/* Cabeçalho do Relatório */}
        <div className="pdf-header">
          <p className="pdf-issue-date">Emitido em: {emissionDate}</p>
          <h1 className="pdf-main-title">{getViewModeTitle()}</h1>
          <div className="pdf-summary">
            <p><strong>Total de atividades:</strong> {activities.length}</p>
            <p><strong>Modo de visualização:</strong> {viewMode === 'day' ? 'Diário' : viewMode === 'week' ? 'Semanal' : 'Mensal'}</p>
            {getFilterSummary() && (
              <p className="pdf-filters"><strong>Filtros aplicados:</strong> {getFilterSummary()}</p>
            )}
          </div>
        </div>

        {/* Seção de Atividades */}
        <div className="pdf-activities-section">
          {sortedActivities && sortedActivities.length > 0 ? (
            sortedActivities.map((activity, index) => (
              <div key={activity.id || index} className="pdf-activity">
                {/* Título da Atividade */}
                <h3 className="pdf-activity-title">{activity.title}</h3>

                {/* Grid de Detalhes da Atividade */}
                <div className="pdf-activity-grid">
                  <p><strong>Cliente:</strong> {getClientName(activity.clientId, clients)}</p>
                  <p><strong>Status:</strong> {getActivityStatusText(activity.status)}</p>
                  <p><strong>Prioridade:</strong> {getActivityPriorityText(activity.priority)}</p>
                  <p><strong>Tipo:</strong> {activity.type || '-'}</p>
                  <p><strong>Data de Início:</strong> {formatDateTime(activity.startDate)}</p>
                  <p><strong>Data de Término:</strong> {activity.endDate ? formatDateTime(activity.endDate) : 'Não definida'}</p>
                  
                  {/* Responsáveis */}
                  <div className="pdf-responsible-list">
                    <strong>Responsável(is):</strong>{' '}
                    {getCollaboratorNames(activity.assignedTo, allUsersData)}
                  </div>
                </div>

                {/* Descrição da Atividade */}
                {activity.description && (
                  <div className="pdf-activity-description">
                     <strong>Descrição:</strong>
                     <p>{activity.description}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="pdf-no-activities">Nenhuma atividade encontrada para este período e filtros aplicados.</p>
          )}
        </div>
      </div>
    );
  }
);

AgendaPdfTemplate.displayName = 'AgendaPdfTemplate';

export default AgendaPdfTemplate;
