import React, { forwardRef } from 'react';
import { Client, PessoaJuridicaClient, PessoaFisicaClient } from '@/services/firebase/clients';
import { Activity, ActivityStatus, ActivityPriority } from '@/services/firebase/activities';
import { UserData } from '@/services/firebase/auth'; // Import UserData se precisar de mais dados de collaborators
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Interfaces de Props ---
interface PdfReportTemplateProps {
  client: Client;
  activities: Activity[];
  // Mapa de ID de usuário para NOME (string) - CORRIGIDO
  assignees: Record<string, string>;
  // Mapa completo de colaboradores (mantido caso precise de outros dados no futuro)
  collaborators: Record<string, UserData & { uid: string }>;
  emissionDate: string; // Data de emissão já formatada
}

// --- Funções Auxiliares (podem ser movidas para utils se usadas em outros lugares) ---

/**
 * Formata uma string de data (ISO ou similar) para dd/MM/yyyy.
 */
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    // Tenta criar a data assumindo que pode ser ISO ou um formato reconhecível
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


// --- Componente PdfReportTemplate ---

const PdfReportTemplate = forwardRef<HTMLDivElement, PdfReportTemplateProps>(
  ({ client, activities, assignees, collaborators, emissionDate }, ref) => {

    const clientNameDisplay = client.type === 'juridica'
      ? (client as PessoaJuridicaClient).companyName
      : client.name;

    return (
      <div ref={ref} className="pdf-container">
        {/* Cabeçalho do Relatório */}
        <div className="pdf-header">
          <p className="pdf-issue-date">Emitido em: {emissionDate}</p>
          <h1 className="pdf-main-title">Relatório de Atividades</h1>
          <h2 className="pdf-client-name">{clientNameDisplay}</h2>
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
                  <p><strong>Status:</strong> {getActivityStatusText(activity.status)}</p>
                  <p><strong>Prioridade:</strong> {getActivityPriorityText(activity.priority)}</p>
                  <p><strong>Período:</strong> {formatDate(activity.startDate)}{activity.endDate ? ` a ${formatDate(activity.endDate)}` : ''}</p>
                  <p><strong>Tipo:</strong> {activity.type || '-'}</p>
                  {/* Responsáveis */}
                  <div className="pdf-responsible-list">
                    <strong>Responsável(is):</strong>{' '}
                    {activity.assignedTo && activity.assignedTo.length > 0
                      ? activity.assignedTo
                          .map(id => assignees[id] || `ID: ${id.substring(0,5)}...`) // Usa o mapa 'assignees'
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
            // Mensagem se não houver atividades
            <p className="pdf-no-activities">Nenhuma atividade encontrada para este período ou filtros.</p>
          )}
        </div>

        {/* (Opcional) Rodapé - Pode adicionar informações aqui se necessário */}
        {/*
        <div className="pdf-footer">
          <p>Nome da Empresa | Contato</p>
        </div>
        */}
      </div>
    );
  }
);

PdfReportTemplate.displayName = 'PdfReportTemplate'; // Boa prática para debugging com forwardRef

export default PdfReportTemplate;