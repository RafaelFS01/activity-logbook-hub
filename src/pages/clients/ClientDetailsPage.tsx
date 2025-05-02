import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getClientById, Client, PessoaJuridicaClient, PessoaFisicaClient } from "@/services/firebase/clients";
import { getActivitiesByClient, Activity, ActivityStatus } from "@/services/firebase/activities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User, Building2, CheckCircle2, XCircle, Clock, FileEdit,
  ArrowLeft, List, CircleAlert, Search, Filter,
  Calendar as CalendarIcon, RotateCcw, FileSpreadsheet, ChevronLeft, ChevronRight, FileText
} from "lucide-react";
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { exportActivitiesToExcel } from "@/utils/exportUtils";
import { getActivityStatusText, getActivityPriorityText } from "@/utils/exportUtils";
import { UserData } from "@/services/firebase/auth";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { Combobox } from "@/components/ui/combobox";
import html2pdf from 'html2pdf.js';
import PdfReportTemplate from '@/components/reports/PdfReportTemplate';
import '@/components/reports/PdfReportTemplate.css';
// Importar o serviço Gemini
import geminiService from "@/services/gemini-service";


const ITEMS_PER_PAGE = 10;

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


const ClientDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<ActivityStatus[]>([]);
  const [dateType, setDateType] = useState<"startDate" | "endDate">("startDate");
  const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined);
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined);
  const [collaborators, setCollaborators] = useState<Record<string, UserData & { uid: string }>>({});
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const pdfReportRef = useRef<HTMLDivElement>(null);

  const handleGenerateDocx = async () => {
    if (!client || filteredActivities.length === 0) {
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Não há dados do cliente ou atividades filtradas para gerar o DOCX."
        });
        return;
    }

    setIsGeneratingDocx(true);
    console.log("Iniciando geração do DOCX...");

    try {
        // 1. Carregar o template da pasta public
        const templatePath = '/templates/template.docx'; // Caminho relativo à raiz do servidor
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`Não foi possível carregar o template.docx. Status: ${response.status} ${response.statusText}`);
        }
        const templateBlob = await response.arrayBuffer(); // Obter como ArrayBuffer
        console.log("Template DOCX carregado.");

        // 2. Gerar descrições resumidas com a IA
        // A função generateActivitySummaries agora lida com o envio em lote único
        toast({
            title: "Processando Atividades",
            description: "Gerando resumos com IA para o relatório DOCX...",
        });
        const activitiesWithSummaries = await generateActivitySummaries(filteredActivities, toast);
        console.log("Descrições resumidas geradas pela IA:", activitiesWithSummaries);


        // 3. Preparar os dados (adaptar aos seus placeholders)
        const clientName = client.type === 'juridica' ? (client as PessoaJuridicaClient).companyName : client.name;

        // Determinar o mês/ano de referência predominante das atividades filtradas
        const monthYearCounts: Record<string, number> = {};
        let maxCount = 0;
        let predominantMonthYear = '';

        activitiesWithSummaries.forEach(activity => {
            const dateString = activity.startDate || activity.endDate;
            if (dateString) {
                try {
                    const date = new Date(dateString);
                    if (!isNaN(date.getTime())) {
                        const monthYearKey = `${date.getMonth() + 1}-${date.getFullYear()}`; // Month is 0-indexed
                        monthYearCounts[monthYearKey] = (monthYearCounts[monthYearKey] || 0) + 1;

                        if (monthYearCounts[monthYearKey] > maxCount) {
                            maxCount = monthYearCounts[monthYearKey];
                            predominantMonthYear = monthYearKey;
                        }
                    }
                } catch (e) {
                    console.error("Erro ao processar data da atividade para contagem de mês/ano:", dateString, e);
                }
            }
        });

        let mesAnoReferencia = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); // Default to current month/year

        if (predominantMonthYear) {
            const [month, year] = predominantMonthYear.split('-').map(Number);
            // Create a date object for the predominant month/year to format it
            const predominantDate = new Date(year, month - 1, 1); // Month is 0-indexed for Date constructor
            mesAnoReferencia = format(predominantDate, 'MMMM \'de\' yyyy', { locale: ptBR });
        }

        const dataExtensoEmissao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });


        const dataForTemplate = {
            entidade_cliente: clientName,
            mes_ano_referencia: mesAnoReferencia,
            lista_servicos: activitiesWithSummaries.map(activity => ({
                // Usar a descrição resumida gerada pela IA
                descricao_servico: activity.summaryDescription || `${activity.title} - ${activity.description}` // Fallback para descrição original
            })),
            data_extenso_emissao: dataExtensoEmissao,
            // Adicione quaisquer outros campos/placeholders que você definiu no template
        };
        console.log("Dados preparados para o template:", dataForTemplate);

        // 4. Processar o template
        const zip = new PizZip(templateBlob);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            // Você pode adicionar um parser customizado se precisar de formatação complexa (HTML, etc.)
            // delimiters: { start: '{', end: '}' } // Padrão
        });

        doc.render(dataForTemplate);
        console.log("Template renderizado.");

        // 5. Gerar o Blob do DOCX final
        const outBlob = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            compression: "DEFLATE"
        });
        console.log("Blob DOCX gerado.");

        // 6. Iniciar o Download
        const safeClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `Relatorio_Atividades_${safeClientName}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.docx`;
        saveAs(outBlob, fileName); // saveAs vem de file-saver

        console.log(`Download DOCX iniciado: ${fileName}`);
        toast({
            title: "DOCX Gerado",
            description: `O arquivo ${fileName} foi baixado com sucesso.`
        });

    } catch (error: any) { // Use 'any' ou um tipo de erro mais específico
        console.error("Erro ao gerar DOCX:", error);
        let description = "Ocorreu um problema ao gerar o arquivo DOCX.";
         // Tenta extrair erros específicos do docxtemplater
        if (error.properties && error.properties.errors instanceof Array) {
            const templateErrors = error.properties.errors.map((err: any) => err.properties.explanation).join('; ');
            description += ` Detalhes: ${templateErrors.substring(0, 150)}... (Ver console)`;
            console.error("Erros do template:", error.properties.errors);
        } else if (error instanceof Error) {
           description = `Erro: ${error.message}`
        }

        toast({
            variant: "destructive",
            title: "Erro ao gerar DOCX",
            description: description
        });
    } finally {
        setIsGeneratingDocx(false);
        console.log("Geração de DOCX finalizada.");
    }
};

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!id) {
          console.error("ID do cliente não encontrado na URL.");
          setClient(null);
          setLoading(false);
          return;
        }

        const clientData = await getClientById(id);
        if (clientData) {
          setClient(clientData);
        } else {
          console.warn(`Cliente com ID ${id} não encontrado.`);
          setClient(null);
          setLoading(false);
          return;
        }

        const clientActivities = await getActivitiesByClient(id);

        const types = Array.from(new Set(clientActivities.map(activity => activity.type).filter(Boolean))) as string[];
        setActivityTypes(types);

        let activitiesToShow = clientActivities;
        if (user?.role === 'collaborator' && user?.uid) {
          activitiesToShow = clientActivities.filter(activity =>
              activity.assignedTo && activity.assignedTo.includes(user.uid)
          );
        }

        setActivities(activitiesToShow);
        setFilteredActivities(activitiesToShow);
        setCurrentPage(1);

        try {
          const usersRef = ref(db, 'users');
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            const usersData = usersSnapshot.val();
            const collaboratorsMap: Record<string, UserData & { uid: string }> = {};
            Object.entries(usersData).forEach(([uid, userData]) => {
              collaboratorsMap[uid] = { ...(userData as UserData), uid };
            });
            setCollaborators(collaboratorsMap);
          } else {
            console.log("Nenhum usuário encontrado no banco de dados.");
            setCollaborators({});
          }
        } catch (userError) {
          console.error("Erro ao buscar colaboradores (ClientDetailsPage):", userError);
          setCollaborators({});
        }
      } catch (error) {
        console.error("Erro ao buscar dados do cliente ou atividades:", error);
        setClient(null);
        setActivities([]);
        setFilteredActivities([]);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível buscar as informações do cliente e atividades."
        })
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  useEffect(() => {
    let filtered = [...activities];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
          activity.title.toLowerCase().includes(lowerSearchTerm) ||
          activity.description.toLowerCase().includes(lowerSearchTerm)
      );
    }

    if (statusFilters.length > 0) {
      filtered = filtered.filter(activity => statusFilters.includes(activity.status));
    }

    if (selectedType) {
      filtered = filtered.filter(activity => activity.type === selectedType);
    }

    if (startPeriod || endPeriod) {
      filtered = filtered.filter(activity => {
        const activityDateStr = dateType === "startDate" ? activity.startDate : (activity.endDate || activity.startDate);
        if (!activityDateStr) return false;

        try {
          const activityDate = new Date(activityDateStr);
          if (isNaN(activityDate.getTime())) return false;

          const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const activityDay = startOfDay(activityDate);

          const startFilter = startPeriod ? startOfDay(startPeriod) : null;
          const endFilter = endPeriod ? startOfDay(endPeriod) : null;

          if (startFilter && endFilter) {
            return activityDay >= startFilter && activityDay <= endFilter;
          } else if (startFilter) {
            return activityDay >= startFilter;
          } else if (endFilter) {
            return activityDay <= endFilter;
          }
        } catch (e) {
          console.error("Erro ao processar data da atividade para filtro:", activityDateStr, e);
          return false;
        }

        return true;
      });
    }

    setFilteredActivities(filtered);
    setCurrentPage(1);
  }, [activities, searchTerm, statusFilters, dateType, startPeriod, endPeriod, selectedType]);

  const totalActivities = filteredActivities.length;
  const totalPages = Math.ceil(totalActivities / ITEMS_PER_PAGE);

  const currentActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      const listElement = document.getElementById('activity-list-container');
      if (listElement) {
        listElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const getClientTypeIcon = () => {
    if (!client) return null;
    return client.type === 'juridica' ?
        <Building2 className="h-5 w-5 mr-2 flex-shrink-0" /> :
        <User className="h-5 w-5 mr-2 flex-shrink-0" />;
  };

  const getStatusBadge = (context: 'client' | 'activity', activityStatus?: ActivityStatus): JSX.Element | null => {
    if (context === 'client') {
      if (!client) return null;
      return client.active ? (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200 whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
          </Badge>
      ) : (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 whitespace-nowrap">
            <XCircle className="h-3 w-3 mr-1" /> Inativo
          </Badge>
      );
    } else if (context === 'activity' && activityStatus) {
      switch(activityStatus) {
        case 'completed': return <Badge className='bg-green-100 text-green-800 border border-green-200 whitespace-nowrap'><CheckCircle2 className="h-3 w-3 mr-1"/>Concluída</Badge>;
        case 'in-progress': return <Badge className='bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap'><RotateCcw className="h-3 w-3 mr-1"/>Em andamento</Badge>;
        case 'cancelled': return <Badge className='bg-red-100 text-red-800 border border-red-200 whitespace-nowrap'><XCircle className="h-3 w-3 mr-1"/>Cancelada</Badge>;
        case 'pending':
        default: return <Badge className='bg-yellow-100 text-yellow-800 border border-yellow-200 whitespace-nowrap'><Clock className="h-3 w-3 mr-1"/>Pendente</Badge>;
      }
    }
    return null;
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("Tentativa de formatar data inválida:", dateString);
        return 'Data inválida';
      }
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
      console.error("Erro ao formatar data:", dateString, error);
      return 'Erro na data';
    }
  };

  const toggleStatusFilter = (status: ActivityStatus) => {
    setStatusFilters(prev => {
      const newFilters = prev.includes(status)
          ? prev.filter(s => s !== status)
          : [...prev, status];
      return newFilters;
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilters([]);
    setStartPeriod(undefined);
    setEndPeriod(undefined);
    setSelectedType(null);
    setDateType("startDate");
  };

  const handleExport = () => {
    if (filteredActivities.length === 0) {
      toast({
        variant: "destructive",
        title: "Sem dados para exportar",
        description: "Não há atividades para exportar com os filtros atuais."
      });
      return;
    }

    try {
      const clientName = client?.type === 'juridica'
          ? (client as PessoaJuridicaClient).companyName
          : client?.name;
      const safeClientName = (clientName || 'cliente').replace(/[^a-z0-9]/gi, '_').toLowerCase();

      const activitiesWithClientName = filteredActivities.map(activity => ({
        ...activity,
        clientName: clientName || 'N/A'
      }));

      const assigneeMap: Record<string, string> = {};
      Object.entries(collaborators).forEach(([id, user]) => {
        assigneeMap[id] = user.name || `Usuário ${id.substring(0, 5)}`;
      });

      exportActivitiesToExcel(
          activitiesWithClientName,
          `atividades_${safeClientName}_${format(new Date(), 'yyyyMMdd')}.xlsx`,
          assigneeMap
      );

      toast({
        title: "Exportação concluída",
        description: `${filteredActivities.length} atividades foram exportadas com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao exportar atividades:', error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar as atividades. Verifique o console para mais detalhes."
      });
    }
  };

  const handleExportPdf = async () => {
    if (!client || filteredActivities.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não há dados do cliente ou atividades filtradas para gerar o PDF."
      });
      return;
    }

    setIsGeneratingPdf(true);
    console.log("Iniciando geração do PDF...");

    try {
      // Gerar descrições resumidas com a IA para o PDF
      toast({
        title: "Processando Atividades",
        description: "Gerando resumos com IA para o relatório PDF...",
      });
      const activitiesWithSummaries = await generateActivitySummaries(filteredActivities, toast);
      console.log("Descrições resumidas geradas pela IA para PDF:", activitiesWithSummaries);

      // Usar o ref para acessar o conteúdo do componente PdfReportTemplate
      const pdfContentElement = pdfReportRef.current;

      if (!pdfContentElement) {
        throw new Error("Elemento de referência do PDF não encontrado.");
      }

      const clientName = client.type === 'juridica' ? (client as PessoaJuridicaClient).companyName : client.name;
      const safeClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `Relatorio_Atividades_${safeClientName}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;

      // Configurações para o html2pdf
      const pdfOptions = {
        margin: [10, 10, 10, 10], // Margens: top, left, bottom, right
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] } // Tenta quebrar páginas corretamente
      };

      // Renderizar o componente com os dados e gerar o PDF
      // Nota: O PdfReportTemplate precisa estar renderizado no DOM para que html2pdf funcione.
      // A visibilidade pode ser controlada por um estado, mas ele deve estar presente.
      // Certifique-se de que o componente PdfReportTemplate usa os dados de activitiesWithSummaries
      // e que o ref `pdfReportRef` está anexado ao elemento raiz desse componente.

      // Para garantir que o componente está renderizado antes de gerar o PDF,
      // você pode precisar de uma lógica de estado ou renderização condicional
      // que garanta que pdfReportRef.current não seja null quando handleExportPdf é chamado.
      // No contexto atual, assumimos que PdfReportTemplate está sempre no DOM,
      // talvez oculto via CSS se não estiver gerando PDF.

      // html2pdf().from(pdfContentElement).set(pdfOptions).save();

      // Alternativa: Renderizar o componente em um elemento temporário fora da tela
      const tempElement = document.createElement('div');
      // tempElement.style.position = 'absolute';
      // tempElement.style.left = '-9999px';
      document.body.appendChild(tempElement);

      // Renderizar o componente React no elemento temporário
      // Isso requer uma forma de renderizar um componente React fora do fluxo normal
      // do JSX, o que geralmente é feito com ReactDOM.render ou createRoot em React 18+.
      // Como estamos em um componente funcional, isso pode ser complexo.
      // A abordagem mais simples é ter o PdfReportTemplate já no DOM e usar o ref.

      // Se pdfReportRef.current é o elemento correto, a linha abaixo deve funcionar:
      html2pdf().from(pdfContentElement).set(pdfOptions).save();


      console.log(`Download PDF iniciado: ${fileName}`);
      toast({
        title: "PDF Gerado",
        description: `O arquivo ${fileName} foi baixado com sucesso.`
      });

    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: `Ocorreu um problema ao gerar o arquivo PDF: ${error.message}`
      });
    } finally {
      setIsGeneratingPdf(false);
      console.log("Geração de PDF finalizada.");
    }
  };


  const typeOptions = activityTypes.map(type => ({
    value: type,
    label: type,
  }));

  // Adicionar uma opção "Todos" ao combobox de tipos
  const typeComboboxOptions = [{ value: '', label: 'Todos os Tipos' }, ...typeOptions];


  if (loading) {
    return (
      <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-32" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center p-10 border rounded-lg bg-card shadow-sm max-w-md">
          <CircleAlert className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-xl font-semibold">Cliente não encontrado</h2>
          <p className="mt-2 text-muted-foreground">O cliente com o ID especificado não pôde ser carregado.</p>
          <Button onClick={() => navigate("/clients")} className="mt-6">
            Voltar para Clientes
          </Button>
        </div>
      </div>
    );
  }

  const clientDetails = client.type === 'juridica' ?
    (client as PessoaJuridicaClient) :
    (client as PessoaFisicaClient);

    // Criar o mapa de assignees (ID -> Nome) para o PdfReportTemplate
    const assigneesMap: Record<string, string> = {};
    if (collaborators) {
        Object.entries(collaborators).forEach(([id, user]) => {
            assigneesMap[id] = user.name || `Usuário ${id.substring(0, 5)}`;
        });
    }

    // Gerar a data de emissão formatada para o PdfReportTemplate
    const emissionDateString = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });


  return (
    <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="flex items-center">
        <Button variant="outline" size="icon" onClick={() => navigate("/clients")} className="mr-4 h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{clientDetails.name}</h1>
      </div>
      <div className="flex gap-2">
        {getStatusBadge('client')}
        <Button variant="default" onClick={() => navigate(`/clients/edit/${id}`)}>
          <FileEdit className="mr-2 h-4 w-4" /> Editar Cliente
        </Button>
      </div>

      <div className="lg:col-span-2">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="activities">Atividades ({totalActivities})</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {getClientTypeIcon()}
                  {client.type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </CardTitle>
                {client.type === 'juridica' && (
                  <CardDescription>{(client as PessoaJuridicaClient).companyName}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {client.type === 'juridica' ? (
                  <>
                    <p><strong>Nome Fantasia:</strong> {(client as PessoaJuridicaClient).fantasyName || '-'}</p>
                    <p><strong>CNPJ:</strong> {(client as PessoaJuridicaClient).cnpj || '-'}</p>
                    <p><strong>Inscrição Estadual:</strong> {(client as PessoaJuridicaClient).stateRegistration || '-'}</p>
                    <p><strong>Inscrição Municipal:</strong> {(client as PessoaJuridicaClient).municipalRegistration || '-'}</p>
                    <p><strong>Responsável:</strong> {(client as PessoaJuridicaClient).responsibleName || '-'}</p>
                    <p><strong>CPF do Responsável:</strong> {(client as PessoaJuridicaClient).responsibleCpf || '-'}</p>
                  </>
                ) : (
                  <>
                    <p><strong>CPF:</strong> {(client as PessoaFisicaClient).cpf || '-'}</p>
                    <p><strong>RG:</strong> {(client as PessoaFisicaClient).rg || '-'}</p>
                  </>
                )}
                <p><strong>Email:</strong> {client.email || '-'}</p>
                <p><strong>Telefone:</strong> {client.phone || '-'}</p>
                <p><strong>Endereço:</strong> {client.address || '-'}</p>
                <p><strong>Criado em:</strong> {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy HH:mm') : '-'}</p>
                <p><strong>Última atualização:</strong> {client.updatedAt ? format(new Date(client.updatedAt), 'dd/MM/yyyy HH:mm') : '-'}</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="activities" className="mt-0">
            <Card>
              <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
                <CardTitle className="flex items-center text-xl">
                  <List className="mr-2 h-5 w-5" /> Lista de Atividades
                </CardTitle>
                <div className="flex flex-shrink-0 gap-2 w-full md:w-auto">
                    <Button
                        onClick={handleExport}
                        variant="outline"
                        size="sm"
                        disabled={filteredActivities.length === 0}
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
                    </Button>
                     <Button
                        onClick={handleGenerateDocx}
                        variant="outline"
                        size="sm"
                        disabled={filteredActivities.length === 0 || isGeneratingDocx}
                    >
                        {isGeneratingDocx ? 'Gerando DOCX...' : <><FileText className="mr-2 h-4 w-4" /> Gerar DOCX</>}
                    </Button>
                     <Button
                        onClick={handleExportPdf}
                        variant="outline"
                        size="sm"
                        disabled={filteredActivities.length === 0 || isGeneratingPdf}
                    >
                        {isGeneratingPdf ? 'Gerando PDF...' : <><FileText className="mr-2 h-4 w-4" /> Gerar PDF</>}
                    </Button>
                  <Button onClick={() => navigate(`/activities/new?clientId=${id}`)} size="sm">
                    <FileEdit className="mr-2 h-4 w-4" /> Nova Atividade
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar atividades..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-full md:w-[250px]"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="status-pending"
                        checked={statusFilters.includes('pending')}
                        onCheckedChange={() => toggleStatusFilter('pending')}
                      />
                      <Label htmlFor="status-pending" className="text-sm font-normal">Pendente</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="status-in-progress"
                        checked={statusFilters.includes('in-progress')}
                        onCheckedChange={() => toggleStatusFilter('in-progress')}
                      />
                      <Label htmlFor="status-in-progress" className="text-sm font-normal">Em andamento</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="status-completed"
                        checked={statusFilters.includes('completed')}
                        onCheckedChange={() => toggleStatusFilter('completed')}
                      />
                      <Label htmlFor="status-completed" className="text-sm font-normal">Concluída</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="status-cancelled"
                        checked={statusFilters.includes('cancelled')}
                        onCheckedChange={() => toggleStatusFilter('cancelled')}
                      />
                      <Label htmlFor="status-cancelled" className="text-sm font-normal">Cancelada</Label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="activity-type-filter" className="text-sm font-medium">Tipo:</Label>
                    <Combobox
                      options={typeComboboxOptions}
                      selectedValue={selectedType || ''}
                      onSelect={(value) => setSelectedType(value === '' ? null : value)}
                      placeholder="Selecione o tipo..."
                      id="activity-type-filter"
                      className="w-[200px]"
                    />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
                   <span className="text-sm font-medium">Período ({dateType === 'startDate' ? 'Início' : 'Fim'}):</span>
                   <RadioGroup value={dateType} onValueChange={(value: "startDate" | "endDate") => setDateType(value)} className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                         <RadioGroupItem value="startDate" id="date-type-start" />
                         <Label htmlFor="date-type-start">Data de Início</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                         <RadioGroupItem value="endDate" id="date-type-end" />
                         <Label htmlFor="date-type-end">Data de Fim</Label>
                      </div>
                   </RadioGroup>
                   <div>
                      <Popover>
                         <PopoverTrigger asChild id="date-start-popover">
                            <Button
                               variant={"outline"}
                               className={cn(
                                   "w-[240px] justify-start text-left font-normal",
                                   !startPeriod && "text-muted-foreground"
                               )}
                            >
                               <CalendarIcon className="mr-2 h-4 w-4" />
                               {startPeriod ? format(startPeriod, "dd/MM/yyyy") : <span>Data de Início</span>}
                            </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                               mode="single"
                               selected={startPeriod}
                               onSelect={setStartPeriod}
                               initialFocus
                               locale={ptBR}
                            />
                         </PopoverContent>
                      </Popover>
                   </div>
                    <div>
                      <Popover>
                         <PopoverTrigger asChild id="date-end-popover">
                            <Button
                               variant={"outline"}
                               className={cn(
                                   "w-[240px] justify-start text-left font-normal",
                                   !endPeriod && "text-muted-foreground"
                               )}
                            >
                               <CalendarIcon className="mr-2 h-4 w-4" />
                               {endPeriod ? format(endPeriod, "dd/MM/yyyy") : <span>Data de Fim</span>}
                            </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                               mode="single"
                               selected={endPeriod}
                               onSelect={setEndPeriod}
                               initialFocus
                               locale={ptBR}
                            />
                         </PopoverContent>
                      </Popover>
                   </div>
                   <Button variant="outline" size="sm" onClick={resetFilters}>
                       <RotateCcw className="mr-2 h-4 w-4" /> Limpar Filtros
                   </Button>
                </div>

                <div id="activity-list-container" className="space-y-4">
                    {filteredActivities.length > 0 ? (
                        currentActivities.map((activity) => (
                            <Card key={activity.id} className="overflow-hidden transition-shadow hover:shadow-md">
                                <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0">
                                  <div className="grid gap-1">
                                    <CardTitle className="text-base">
                                        {activity.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Criado em: {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: ptBR }) : '-'}
                                    </CardDescription>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                      {getStatusBadge('activity', activity.status)}
                                      <Badge variant="secondary" className="whitespace-nowrap">{activity.type || 'Geral'}</Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 text-sm">
                                  <p className="text-muted-foreground mb-2">
                                      <strong>Período:</strong> {formatDate(activity.startDate)} a {formatDate(activity.endDate)}
                                  </p>
                                  <p className="text-muted-foreground mb-2">
                                      <strong>Prioridade:</strong> {getActivityPriorityText(activity.priority)}
                                  </p>
                                  <p className="text-muted-foreground mb-2">
                                      <strong>Responsável(is):</strong> {activity.assignedTo && activity.assignedTo.length > 0
                                          ? activity.assignedTo.map(uid => collaborators[uid]?.name || `Usuário ${uid.substring(0, 5)}`).join(', ')
                                          : 'Não atribuído'}
                                  </p>
                                  <p className="line-clamp-3">{activity.description || 'Sem descrição.'}</p>
                                </CardContent>
                                <CardFooter className="p-2 bg-muted/50 flex justify-end">
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/activities/${activity.id}`)}
                                  >
                                    Ver Detalhes
                                  </Button>
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground">Nenhuma atividade encontrada com os filtros aplicados.</p>
                    )}
                </div>

                {/* Paginação */}
                {filteredActivities.length > ITEMS_PER_PAGE && (
                    <div className="flex justify-center items-center space-x-2 mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Próxima <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Mensagem se não houver atividades após filtro */}
                {filteredActivities.length === 0 && (searchTerm || statusFilters.length > 0 || startPeriod || endPeriod || selectedType) && (
                    <p className="text-center text-muted-foreground mt-4">Nenhuma atividade corresponde aos filtros aplicados.</p>
                )}

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Coluna da direita com informações do cliente */}
      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              {getClientTypeIcon()}
              Detalhes do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p><strong>Nome:</strong> {clientDetails.name}</p>
              {client.type === 'juridica' ? (
                  <>
                      <p><strong>Nome Fantasia:</strong> {(client as PessoaJuridicaClient).fantasyName || '-'}</p>
                      <p><strong>CNPJ:</strong> {(client as PessoaJuridicaClient).cnpj || '-'}</p>
                  </>
              ) : (
                  <>
                      <p><strong>CPF:</strong> {(client as PessoaFisicaClient).cpf || '-'}</p>
                  </>
              )}
              <p><strong>Email:</strong> {client.email || '-'}</p>
              <p><strong>Telefone:</strong> {client.phone || '-'}</p>
              <p><strong>Endereço:</strong> {client.address || '-'}</p>
              <p><strong>Status:</strong> {client.active ? 'Ativo' : 'Inativo'}</p>
              {client.type === 'juridica' ? (
                  <Badge variant="secondary" className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" /> Pessoa Jurídica
                  </Badge>
              ) : (
                  <Badge variant="secondary" className="flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Pessoa Física
                  </Badge>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => navigate(`/clients/edit/${id}`)}>
              <FileEdit className="mr-2 h-4 w-4" /> Editar Cliente
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Componente PdfReportTemplate (pode estar oculto, mas necessário no DOM para html2pdf) */}
      {client && filteredActivities && collaborators && (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
              <PdfReportTemplate
                  ref={pdfReportRef}
                  client={client}
                  activities={filteredActivities} // Passa as atividades filtradas (com resumos da IA)
                  collaborators={collaborators}
                  assignees={assigneesMap} // Passa o mapa de assignees
                  emissionDate={emissionDateString} // Passa a data de emissão formatada
              />
          </div>
      )}
    </div>
  );
};

export default ClientDetailsPage;