import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { getClients, Client } from "@/services/firebase/clients";
import { getActivitiesByClient, Activity } from "@/services/firebase/activities";
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
// Importar o serviço Gemini
import geminiService from "@/services/gemini-service";

// Função assíncrona para gerar descrições resumidas usando a IA (agora em uma única requisição)
const generateActivitySummaries = async (activities: Activity[], toast: any): Promise<(Activity & { summaryDescription?: string })[]> => {
    if (activities.length === 0) {
        toast({
            title: "Geração de Resumos",
            description: "Nenhuma atividade para resumir.",
        });
        return activities; // Retorna atividades originais se não houver o que resumir
    }

    toast({
        title: "Gerando Resumos com IA",
        description: `Iniciando a geração de resumos para ${activities.length} atividades em uma única requisição...`,
    });

    try {
        // Chamar a nova função do serviço que envia todas as atividades em uma requisição
        const summaryResponse = await geminiService.generateSummariesSingleRequest(activities);

        // Verificar se a resposta tem a estrutura JSON esperada
        if (!summaryResponse || !Array.isArray(summaryResponse.summaries)) {
             console.error("Resposta da IA em formato inesperado:", summaryResponse);
             toast({
                 variant: "destructive",
                 title: "Erro na Geração de Resumos",
                 description: "A IA retornou um formato inesperado. Resumos não gerados."
             });
             // Retorna atividades sem resumos ou com fallback em caso de erro de formato
             return activities.map(activity => ({
                 ...activity,
                 summaryDescription: activity.description || activity.title || 'Resumo não disponível (Erro na IA)'
             }));
        }

        // Criar um mapa para facilitar a busca dos resumos pelo ID da atividade
        const summariesMap = summaryResponse.summaries.reduce((acc: Record<string, string>, item: { id: string; summary: string }) => {
            if (item.id && item.summary) {
                acc[item.id] = item.summary;
            }
            return acc;
        }, {} as Record<string, string>);

        // Mapear os resumos de volta para as atividades originais
        const activitiesWithSummaries = activities.map(activity => ({
            ...activity,
            // Usa o resumo gerado pela IA se existir, caso contrário, usa a descrição original ou fallback
            summaryDescription: summariesMap[activity.id] || activity.description || activity.title || 'Resumo não disponível'
        }));

        toast({
            title: "Geração de Resumos Concluída",
            description: `Resumos gerados para ${activities.length} atividades.`,
        });

        return activitiesWithSummaries;

    } catch (error: any) { // Usar 'any' ou um tipo de erro mais específico
        console.error("Erro ao gerar resumos em lote:", error);
        toast({
            variant: "destructive",
            title: "Erro na Geração de Resumos",
            description: `Ocorreu um erro ao gerar os resumos com a IA: ${error.message}`
        });
        // Retorna atividades com uma descrição de fallback em caso de erro na requisição
        return activities.map(activity => ({
            ...activity,
            summaryDescription: activity.description || activity.title || 'Resumo não disponível (Erro)'
        }));
    }
};

interface ReportConfigCardProps {}

export const ReportConfigCard = ({}: ReportConfigCardProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Carregar clientes ativos e preparar opções para Combobox
  useEffect(() => {
    const loadClients = async () => {
      try {
        const allClients = await getClients();
        const activeClients = allClients.filter(client => client.active);
        setClients(activeClients);
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar clientes",
          description: "Não foi possível carregar a lista de clientes."
        });
      }
    };

    loadClients();
  }, [toast]);

  // Preparar opções para o Combobox
  const clientOptions: ComboboxOption[] = clients.map(client => ({
    value: client.id,
    label: client.type === 'juridica'
      ? (client as any).companyName || client.name
      : client.name
  }));

  // Função para gerar o relatório
  const handleGenerateReport = async () => {
    if (!selectedClient || !startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Selecione um cliente e defina o período do relatório."
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        variant: "destructive",
        title: "Período inválido",
        description: "A data de início deve ser anterior à data de fim."
      });
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Buscar atividades do cliente
      const clientActivities = await getActivitiesByClient(selectedClient);

      // 2. Filtrar atividades pelo período selecionado
      const filteredActivities = clientActivities.filter(activity => {
        if (!activity.startDate) return false;

        const activityDate = new Date(activity.startDate);
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        return activityDate >= startOfDay && activityDate <= endOfDay;
      });

      if (filteredActivities.length === 0) {
        toast({
          variant: "destructive",
          title: "Sem atividades",
          description: "Não foram encontradas atividades para o cliente e período selecionados."
        });
        return;
      }

      // 3. Gerar descrições resumidas com a IA
      toast({
        title: "Processando Atividades",
        description: "Gerando resumos com IA para o relatório...",
      });
      const activitiesWithSummaries = await generateActivitySummaries(filteredActivities, toast);

      // 3. Buscar dados do cliente selecionado
      const client = clients.find(c => c.id === selectedClient);
      if (!client) {
        toast({
          variant: "destructive",
          title: "Cliente não encontrado",
          description: "Não foi possível encontrar os dados do cliente selecionado."
        });
        return;
      }

      // 4. Carregar o template
      const templatePath = '/templates/template - Copia.docx';
      const response = await fetch(templatePath);
      if (!response.ok) {
        throw new Error(`Não foi possível carregar o template. Status: ${response.status}`);
      }
      const templateBlob = await response.arrayBuffer();

      // 5. Preparar dados para o template
      const clientName = client.type === 'juridica'
        ? (client as any).companyName || client.name
        : client.name;

      const dataInicial = format(startDate, 'dd/MM/yyyy');
      const dataFinal = format(endDate, 'dd/MM/yyyy');
      const dataEmissao = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const dataForTemplate = {
        entidade_cliente: clientName,
        data_inicial: dataInicial,
        data_final: dataFinal,
        lista_servicos: activitiesWithSummaries.map(activity => ({
          // Usar a descrição resumida gerada pela IA
          descricao_servico: activity.summaryDescription || `${activity.title}${activity.description ? ` - ${activity.description}` : ''}`
        })),
        data_extenso_emissao: dataEmissao
      };

      // 6. Processar o template
      const zip = new PizZip(templateBlob);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render(dataForTemplate);

      // 7. Gerar o arquivo
      const outBlob = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE"
      });

      // 8. Download do arquivo
      const safeClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `Relatorio_Atividades_${safeClientName}_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.docx`;
      saveAs(outBlob, fileName);

      toast({
        title: "Relatório gerado",
        description: `${filteredActivities.length} atividades incluídas no relatório ${fileName}.`
      });

    } catch (error: any) {
      console.error("Erro ao gerar relatório:", error);

      let errorMessage = "Ocorreu um erro ao gerar o relatório.";
      if (error.properties && error.properties.errors) {
        const templateErrors = error.properties.errors.map((err: any) =>
          err.properties?.explanation || err.message
        ).join('; ');
        errorMessage += ` Detalhes: ${templateErrors.substring(0, 150)}...`;
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }

      toast({
        variant: "destructive",
        title: "Erro na geração do relatório",
        description: errorMessage
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setSelectedClient("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seleção de Cliente */}
        <div className="space-y-2">
          <Label htmlFor="client-combobox">Cliente *</Label>
          <Combobox
            id="client-combobox"
            options={clientOptions}
            selectedValue={selectedClient}
            onSelect={setSelectedClient}
            placeholder="Selecione um cliente"
            searchPlaceholder="Buscar cliente..."
            noResultsText="Nenhum cliente encontrado."
            allowClear={true}
            disabled={clientOptions.length === 0}
            className="w-full"
          />
        </div>

        {/* Período - Data Inicial */}
        <div className="space-y-2">
          <Label>Data Inicial *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione a data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                disabled={(date) => endDate ? date > endDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Período - Data Final */}
        <div className="space-y-2">
          <Label>Data Final *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione a data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                disabled={(date) => startDate ? date < startDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating || !selectedClient || !startDate || !endDate}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              Gerando Relatório...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Gerar Relatório
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleClearFilters}
          disabled={isGenerating}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpar Filtros
        </Button>
      </div>

      {/* Informações adicionais */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">Sobre este relatório:</p>
            <ul className="mt-1 space-y-1">
              <li>• Utiliza o template personalizado da empresa</li>
              <li>• Inclui todas as atividades do período selecionado</li>
              <li>• Usa IA para gerar resumos aprimorados das atividades</li>
              <li>• Arquivo gerado em formato DOCX para edição</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

