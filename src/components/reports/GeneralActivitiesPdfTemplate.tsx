import React, { forwardRef } from 'react';
import { Activity, ActivityStatus, ActivityPriority } from '@/services/firebase/activities';
import { Client, PessoaJuridicaClient } from '@/services/firebase/clients';
import { UserData } from '@/services/firebase/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Interfaces de Props ---
interface GeneralActivitiesPdfTemplateProps {
  activities: Activity[];
  clients: Record<string, Client>;
  assignees: Record<string, string>;
  emissionDate: string;
  totalActivities: number;
  filterInfo?: {
    searchTerm?: string;
    statusFilters?: ActivityStatus[];
    dateType?: 'startDate' | 'endDate';
    startPeriod?: Date;
    endPeriod?: Date;
    selectedCollaborator?: string;
    selectedType?: string;
  };
}

// --- Funções Auxiliares ---

/**
 * Formata uma string de data (ISO ou similar) para dd/MM/yyyy.
 */
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
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
const getClientName = (clientId: string | undefined, clients: Record<string, Client>): string => {
  if (!clientId) return 'Cliente não especificado';
  const client = clients[clientId];
  if (!client) return `Cliente ID: ${clientId.substring(0, 6)}...`;
  return client.type === 'juridica'
    ? (client as PessoaJuridicaClient).companyName || client.name || 'Empresa sem nome'
    : client.name || 'Cliente sem nome';
};

// --- Componente GeneralActivitiesPdfTemplate ---

const GeneralActivitiesPdfTemplate = forwardRef<HTMLDivElement, GeneralActivitiesPdfTemplateProps>(
  ({ activities, clients, assignees, emissionDate, totalActivities, filterInfo }, ref) => {

    const getFilterSummary = () => {
      if (!filterInfo) return '';
      
      const filters = [];
      
      if (filterInfo.searchTerm) {
        filters.push(`Busca: "${filterInfo.searchTerm}"`);
      }
      
      if (filterInfo.statusFilters && filterInfo.statusFilters.length > 0) {
        const statusNames = filterInfo.statusFilters.map(status => {
          switch (status) {
            case 'pending': return 'Pendente';
            case 'in-progress': return 'Em Andamento';
            case 'completed': return 'Concluída';
            case 'cancelled': return 'Cancelada';
            default: return status;
          }
        });
        filters.push(`Status: ${statusNames.join(', ')}`);
      }
      
      if (filterInfo.startPeriod || filterInfo.endPeriod) {
        const dateTypeText = filterInfo.dateType === 'startDate' ? 'Início' : 'Fim';
        let periodText = `Período (${dateTypeText}): `;
        if (filterInfo.startPeriod && filterInfo.endPeriod) {
          periodText += `${formatDate(filterInfo.startPeriod.toISOString())} a ${formatDate(filterInfo.endPeriod.toISOString())}`;
        } else if (filterInfo.startPeriod) {
          periodText += `a partir de ${formatDate(filterInfo.startPeriod.toISOString())}`;
        } else if (filterInfo.endPeriod) {
          periodText += `até ${formatDate(filterInfo.endPeriod.toISOString())}`;
        }
        filters.push(periodText);
      }
      
      if (filterInfo.selectedType) {
        filters.push(`Tipo: ${filterInfo.selectedType}`);
      }
      
      return filters.length > 0 ? filters.join(' | ') : '';
    };

    return (
      <div ref={ref} className="pdf-container">
        {/* Cabeçalho do Relatório */}
        <div className="pdf-header">
          <p className="pdf-issue-date">Emitido em: {emissionDate}</p>
          <h1 className="pdf-main-title">Relatório Geral de Atividades</h1>
          <div className="pdf-summary">
            <p><strong>Total de atividades:</strong> {totalActivities}</p>
            <p><strong>Atividades no relatório:</strong> {activities.length}</p>
            {getFilterSummary() && (
              <p className="pdf-filters"><strong>Filtros aplicados:</strong> {getFilterSummary()}</p>
            )}
          </div>
        </div>

        {/* Seção de Atividades */}
        <div className="pdf-activities-section">
          {activities && activities.length > 0 ? (
            activities.map((activity, index) => (
              <div key={activity.id || index} className="pdf-activity">
                {/* Título da Atividade */}
                <h3 className="pdf-activity-title">{activity.title}</h3>

                {/* Grid de Detalhes da Atividade */}
                <div className="pdf-activity-grid">
                  <p><strong>Cliente:</strong> {getClientName(activity.clientId, clients)}</p>
                  <p><strong>Status:</strong> {getActivityStatusText(activity.status)}</p>
                  <p><strong>Prioridade:</strong> {getActivityPriorityText(activity.priority)}</p>
                  <p><strong>Tipo:</strong> {activity.type || '-'}</p>
                  <p><strong>Período:</strong> {formatDate(activity.startDate)}{activity.endDate ? ` a ${formatDate(activity.endDate)}` : ''}</p>
                  
                  {/* Responsáveis */}
                  <div className="pdf-responsible-list">
                    <strong>Responsável(is):</strong>{' '}
                    {activity.assignedTo && activity.assignedTo.length > 0
                      ? activity.assignedTo
                          .map(id => assignees[id] || `ID: ${id.substring(0,5)}...`)
                          .join(', ')
                      : 'Nenhum'}
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
            <p className="pdf-no-activities">Nenhuma atividade encontrada para os filtros aplicados.</p>
          )}
        </div>
      </div>
    );
  }
);

GeneralActivitiesPdfTemplate.displayName = 'GeneralActivitiesPdfTemplate';

export default GeneralActivitiesPdfTemplate;
