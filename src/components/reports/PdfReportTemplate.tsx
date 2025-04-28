import React from 'react';
import { Client, PessoaJuridicaClient } from '../../services/firebase/clients'; // Ajustado o caminho
import { Activity } from '../../services/firebase/activities'; // Ajustado o caminho
import { formatDate, getActivityStatusText, getActivityPriorityText } from '../../utils/exportUtils'; // Ajustado o caminho e importado helpers existentes
import './PdfReportTemplate.css'; // CSS específico para o PDF

interface PdfReportTemplateProps {
  client: Client;
  activities: Activity[];
  assignees: Record<string, string>;
  emissionDate: string;
}

const PdfReportTemplate: React.FC<PdfReportTemplateProps> = ({ client, activities, assignees, emissionDate }) => {
  const clientName = client.type === 'juridica' ? (client as PessoaJuridicaClient).companyName : client.name;

  return (
    <div id="pdf-report-content" className="pdf-container"> {/* ID e classe para CSS */}
      <p className="pdf-issue-date">Emitido em: {emissionDate}</p>
      <h1 className="pdf-main-title">Relatório de Atividades</h1>
      <h2 className="pdf-client-name">{clientName}</h2>

      {activities.length > 0 ? activities.map((activity) => (
        <div key={activity.id} className="pdf-activity">
          <h3 className="pdf-activity-title">{activity.title}</h3>
          <div className="pdf-activity-grid">
            <div className="pdf-details-left">
              <p><strong>Responsável:</strong> {activity.assignedTo?.map(id => assignees[id] || id).join(', ') || 'N/A'}</p>
              <p><strong>Status:</strong> {getActivityStatusText(activity.status)}</p>
              <p><strong>Prioridade:</strong> {getActivityPriorityText(activity.priority)}</p> {/* Adicionado Prioridade */}
              {/* Adicionar outros campos como Tipo se necessário */}
              {/* Hora de início/fim pode ser complexo, talvez omitir ou formatar */}
            </div>
            <div className="pdf-details-right">
              <p><strong>Data de Início:</strong> {formatDate(activity.startDate)}</p>
              <p><strong>Data de Término:</strong> {formatDate(activity.endDate)}</p>
               <p><strong>Data de Conclusão:</strong> {formatDate(activity.completedDate)}</p>
            </div>
          </div>
          <p className="pdf-activity-description"><strong>Descrição:</strong></p>
          <p className="pdf-activity-description">{activity.description || 'Sem descrição'}</p>
        </div>
      )) : (
        <p className="pdf-no-activities">Nenhuma atividade encontrada para este cliente com os filtros aplicados.</p>
      )}
    </div>
  );
};

export default PdfReportTemplate;