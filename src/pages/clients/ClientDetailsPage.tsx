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


const ITEMS_PER_PAGE = 10;

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

        // 2. Preparar os dados (adaptar aos seus placeholders)
        const clientName = client.type === 'juridica' ? (client as PessoaJuridicaClient).companyName : client.name;
        // Determinar o mês/ano de referência. Pode ser o mês/ano da atividade mais recente ou um período definido.
        // Por enquanto, usaremos o mês/ano atual.
        const mesAnoReferencia = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const dataExtensoEmissao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });


        const dataForTemplate = {
            entidade_cliente: clientName,
            mes_ano_referencia: mesAnoReferencia,
            lista_servicos: filteredActivities.map(activity => ({
                descricao_servico: `${activity.title} - ${activity.description}` // Adapte conforme necessário
            })),
            data_extenso_emissao: dataExtensoEmissao,
            // Adicione quaisquer outros campos/placeholders que você definiu no template
        };
        console.log("Dados preparados para o template:", dataForTemplate);

        // 3. Processar o template
        const zip = new PizZip(templateBlob);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            // Você pode adicionar um parser customizado se precisar de formatação complexa (HTML, etc.)
            // delimiters: { start: '{', end: '}' } // Padrão
        });

        doc.render(dataForTemplate);
        console.log("Template renderizado.");

        // 4. Gerar o Blob do DOCX final
        const outBlob = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            compression: "DEFLATE"
        });
        console.log("Blob DOCX gerado.");

        // 5. Iniciar o Download
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
    if (!client || !pdfReportRef.current || filteredActivities.length === 0) {
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
        const emissionDate = new Date().toLocaleDateString('pt-BR');
        const clientNameForFile = (client.type === 'juridica'
            ? (client as PessoaJuridicaClient).companyName
            : client.name
        ).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `Relatorio_Atividades_${clientNameForFile}_${emissionDate.replace(/\//g, '-')}.pdf`;

        const options = {
            margin: [0, 2, 15, 10],
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                logging: true, // Habilitado para depuração
                useCORS: true,
                scrollX: 0,
                scrollY: 0,
                // windowWidth: pdfReportRef.current.scrollWidth, // Comentado para depuração
                // windowHeight: pdfReportRef.current.scrollHeight, // Comentado para depuração
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        console.log("Elemento para converter:", pdfReportRef.current);
        console.log("Opções:", options);

        await html2pdf().from(pdfReportRef.current).set(options).save();

        console.log("PDF gerado com sucesso.");
        toast({
            title: "PDF Gerado",
            description: `O arquivo ${fileName} foi baixado com sucesso.`
        });

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast({
            variant: "destructive",
            title: "Erro ao gerar PDF",
            description: "Ocorreu um problema ao gerar o arquivo PDF. Verifique o console."
        });
    } finally {
        setIsGeneratingPdf(false);
        console.log("Geração de PDF finalizada (sucesso ou falha).");
    }


  };


  const typeOptions = activityTypes.map(type => ({
    value: type,
    label: type
  }));

  if (loading) {
    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
          <div className="flex items-center mb-6">
            <Skeleton className="h-9 w-9 rounded-full mr-2" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-9 w-24 ml-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
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
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-6 w-1/2" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
    );
  }

  if (!client) {
    return (
        <div className="container mx-auto py-6 px-4 md:px-6 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="text-center p-10 border rounded-lg bg-card shadow-sm max-w-md">
            <CircleAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Cliente não encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Não foi possível encontrar o cliente com o ID fornecido ({id}). Ele pode ter sido removido ou o ID está incorreto.
            </p>
            <Button onClick={() => navigate("/clients")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Lista de Clientes
            </Button>
          </div>
        </div>
    );
  }

  return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center">
            <Button variant="outline" size="icon" onClick={() => navigate("/clients")} className="mr-4 h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Voltar para Clientes</span>
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              {getClientTypeIcon()}
              <span className="truncate max-w-[200px] sm:max-w-[400px] md:max-w-full">
              {client.type === 'juridica'
                  ? (client as PessoaJuridicaClient).companyName
                  : client.name
              }
            </span>
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={() => navigate(`/clients/edit/${id}`)}>
              <FileEdit className="h-4 w-4 mr-2" />
              Editar Cliente
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="info">Informações do Cliente</TabsTrigger>
                <TabsTrigger value="activities">Atividades ({totalActivities})</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Dados Cadastrais</CardTitle>
                    <CardDescription>
                      Detalhes do cliente {client.type === 'juridica' ? ' (Pessoa Jurídica)' : ' (Pessoa Física)'}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium text-muted-foreground">Status:</span>
                      <span className="text-right">{getStatusBadge('client')}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium text-muted-foreground">E-mail:</span>
                      <span className="text-right break-all">{client.email || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium text-muted-foreground">Telefone:</span>
                      <span className="text-right whitespace-nowrap">{client.phone || '-'}</span>
                    </div>
                    {client.type === 'fisica' ? (
                        <>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium text-muted-foreground">CPF:</span>
                            <span className="text-right">{(client as PessoaFisicaClient).cpf || '-'}</span>
                          </div>
                          {(client as PessoaFisicaClient).rg && (
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="font-medium text-muted-foreground">RG:</span>
                                <span className="text-right">{(client as PessoaFisicaClient).rg}</span>
                              </div>
                          )}
                        </>
                    ) : (
                        <>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium text-muted-foreground">CNPJ:</span>
                            <span className="text-right">{(client as PessoaJuridicaClient).cnpj || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium text-muted-foreground">Razão Social:</span>
                            <span className="text-right">{(client as PessoaJuridicaClient).companyName || '-'}</span>
                          </div>
                          {(client as PessoaJuridicaClient).responsibleName && (
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="font-medium text-muted-foreground">Responsável:</span>
                                <span className="text-right">{(client as PessoaJuridicaClient).responsibleName}</span>
                              </div>
                          )}
                        </>
                    )}
                    {client.address && (
                        <div className="flex justify-between items-start py-2 border-b">
                          <span className="font-medium text-muted-foreground flex-shrink-0 mr-4">Endereço:</span>
                          <span className="text-right">{client.address}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium text-muted-foreground">Criado em:</span>
                      <span className="text-right">{formatDate(client.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-medium text-muted-foreground">Última atualização:</span>
                      <span className="text-right">{formatDate(client.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                <Card>
                  <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
                    <div>
                      <CardTitle>Atividades do Cliente</CardTitle>
                      <CardDescription>
                        Visualize e gerencie as atividades associadas. {totalActivities} encontrada(s).
                      </CardDescription>
                    </div>
                    <div className="flex flex-shrink-0 gap-2 w-full md:w-auto">
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={handleExport}
                          disabled={filteredActivities.length === 0}
                          className="flex-1 md:flex-none"
                      >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Exportar (Excel) ({filteredActivities.length})
                      </Button>
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={handleExportPdf}
                          disabled={filteredActivities.length === 0 || isGeneratingPdf}
                          className="flex-1 md:flex-none"
                      >
                          {isGeneratingPdf ? (
                              <>
                                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                                  Gerando PDF...
                              </>
                          ) : (
                              <>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Exportar PDF ({filteredActivities.length})
                              </>
                          )}
                      </Button>
<Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateDocx}
                          disabled={filteredActivities.length === 0 || isGeneratingDocx}
                          className="flex-1 md:flex-none" // Manter consistência de layout
                      >
                          {isGeneratingDocx ? (
                              <>
                                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                                  Gerando DOCX...
                              </>
                          ) : (
                              <>
                                  <FileText className="mr-2 h-4 w-4" /> {/* Ou FileWord se tiver */}
                                  Exportar DOCX ({filteredActivities.length})
                              </>
                          )}
                      </Button>
                      <Button
                          size="sm"
                          onClick={() => navigate("/activities/new", { state: { clientId: id } })}
                          className="flex-1 md:flex-none"
                      >
                        Nova Atividade
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 mb-6 p-4 border rounded-md bg-muted/30">
                      <h4 className="text-base font-semibold mb-3 flex items-center"><Filter className="h-4 w-4 mr-2"/>Filtros</h4>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por título ou descrição..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      {typeOptions.length > 0 && (
                          <div>
                            <Label className="mb-1 block text-sm font-medium">Tipo de Atividade</Label>
                            <Combobox
                                options={typeOptions}
                                selectedValue={selectedType}
                                onSelect={(value) => setSelectedType(value)}
                                placeholder="Todos os tipos"
                                searchPlaceholder="Buscar tipo..."
                                noResultsText="Nenhum tipo encontrado."
                                allowClear={true}
                                triggerClassName="w-full"
                            />
                          </div>
                      )}

                      <div>
                        <Label className="block text-sm font-medium mb-2">Status</Label>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                                id="status-pending"
                                checked={statusFilters.includes("pending")}
                                onCheckedChange={() => toggleStatusFilter("pending")}
                            />
                            <Label htmlFor="status-pending" className="flex items-center cursor-pointer text-sm font-normal">
                              <Clock className="h-3 w-3 mr-1.5 text-yellow-600" /> Pendentes
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                                id="status-in-progress"
                                checked={statusFilters.includes("in-progress")}
                                onCheckedChange={() => toggleStatusFilter("in-progress")}
                            />
                            <Label htmlFor="status-in-progress" className="flex items-center cursor-pointer text-sm font-normal">
                              <RotateCcw className="h-3 w-3 mr-1.5 text-blue-600" /> Em Progresso
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                                id="status-completed"
                                checked={statusFilters.includes("completed")}
                                onCheckedChange={() => toggleStatusFilter("completed")}
                            />
                            <Label htmlFor="status-completed" className="flex items-center cursor-pointer text-sm font-normal">
                              <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-600" /> Concluídas
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                                id="status-cancelled"
                                checked={statusFilters.includes("cancelled")}
                                onCheckedChange={() => toggleStatusFilter("cancelled")}
                            />
                            <Label htmlFor="status-cancelled" className="flex items-center cursor-pointer text-sm font-normal">
                              <XCircle className="h-3 w-3 mr-1.5 text-red-600" /> Canceladas
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end pt-2">
                        <div>
                          <Label className="mb-1.5 block text-sm font-medium">Filtrar por Data</Label>
                          <RadioGroup
                              value={dateType}
                              onValueChange={(value) => setDateType(value as "startDate" | "endDate")}
                              className="flex space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="startDate" id="start-date" />
                              <Label htmlFor="start-date" className="font-normal cursor-pointer">Início</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="endDate" id="end-date" />
                              <Label htmlFor="end-date" className="font-normal cursor-pointer">Término</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div>
                          <Label htmlFor="date-start-popover" className="mb-1.5 block text-sm font-medium">Período - De</Label>
                          <Popover>
                            <PopoverTrigger asChild id="date-start-popover">
                              <Button
                                  variant="outline"
                                  className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !startPeriod && "text-muted-foreground"
                                  )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startPeriod ? format(startPeriod, "dd/MM/yyyy") : <span>Selecione início</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                  mode="single"
                                  selected={startPeriod}
                                  onSelect={setStartPeriod}
                                  initialFocus
                                  disabled={(date) => endPeriod ? date > endPeriod : false }
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label htmlFor="date-end-popover" className="mb-1.5 block text-sm font-medium">Período - Até</Label>
                          <Popover>
                            <PopoverTrigger asChild id="date-end-popover">
                              <Button
                                  variant="outline"
                                  className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !endPeriod && "text-muted-foreground"
                                  )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endPeriod ? format(endPeriod, "dd/MM/yyyy") : <span>Selecione fim</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                  mode="single"
                                  selected={endPeriod}
                                  onSelect={setEndPeriod}
                                  initialFocus
                                  disabled={(date) => startPeriod ? date < startPeriod : false}
                               />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!searchTerm && statusFilters.length === 0 && !startPeriod && !endPeriod && !selectedType}>
                          <RotateCcw className="h-4 w-4 mr-1.5"/> Limpar Todos os Filtros
                        </Button>
                      </div>
                    </div>

                    {filteredActivities.length > 0 ? (
                        <div className="space-y-4" id="activity-list-container">
                          {currentActivities.map((activity) => (
                              <Card key={activity.id} className="overflow-hidden transition-shadow hover:shadow-md">
                                <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0">
                                  <div className="space-y-1">
                                    <CardTitle className="text-base font-semibold leading-none">{activity.title}</CardTitle>
                                    {activity.type && <CardDescription className="text-xs">Tipo: {activity.type}</CardDescription>}
                                  </div>
                                  <div className="flex-shrink-0 ml-4">
                                    {getStatusBadge('activity', activity.status)}
                                  </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 text-sm">
                                  <p className="text-muted-foreground mb-3 line-clamp-2">
                                    {activity.description || <span className="italic">Sem descrição</span>}
                                  </p>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground space-y-1 sm:space-y-0">
                                    <div className="flex items-center">
                                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                                      <span>Início: {formatDate(activity.startDate)}</span>
                                      {activity.endDate && (
                                          <>
                                            <span className="mx-1.5">•</span>
                                            <span>Fim: {formatDate(activity.endDate)}</span>
                                          </>
                                      )}
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1.5" />
                                      <span>
                                    Atualizado {formatDistanceToNow(new Date(activity.updatedAt), {
                                        addSuffix: true,
                                        locale: ptBR
                                      })}
                                  </span>
                                    </div>
                                  </div>
                                </CardContent>
                                <CardFooter className="p-2 bg-muted/50 flex justify-end">
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/activities/${activity.id}`)}
                                      className="text-primary hover:text-primary"
                                  >
                                    Ver detalhes
                                  </Button>
                                </CardFooter>
                              </Card>
                          ))}

                          {totalPages > 1 && (
                              <div className="flex items-center justify-center space-x-2 pt-6 mt-6 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                  <ChevronLeft className="h-4 w-4 mr-1"/>
                                  Anterior
                                </Button>
                                <span className="text-sm text-muted-foreground">
                            Página {currentPage} de {totalPages}
                          </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                  Próxima
                                  <ChevronRight className="h-4 w-4 ml-1"/>
                                </Button>
                              </div>
                          )}
                        </div>
                    ) : (
                        <div className="text-center py-10 px-6 border border-dashed rounded-lg bg-muted/20">
                          <List className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
                          <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
                            {searchTerm || statusFilters.length > 0 || startPeriod || endPeriod || selectedType ?
                                "Não foram encontradas atividades com os filtros aplicados. Tente ajustar sua busca." :
                                "Este cliente ainda não possui atividades registradas."}
                          </p>
                          {searchTerm || statusFilters.length > 0 || startPeriod || endPeriod || selectedType ? (
                              <Button variant="secondary" onClick={resetFilters}>Limpar Filtros</Button>
                          ) : (
                              <Button onClick={() => navigate("/activities/new", { state: { clientId: id } })}>
                                Criar Nova Atividade
                              </Button>
                          )}
                        </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Resumo Rápido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-medium mb-1.5 text-muted-foreground">Tipo de Cliente</h4>
                    <div className="flex items-center">
                      {client.type === 'juridica' ? (
                          <Badge variant="secondary" className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            Pessoa Jurídica
                          </Badge>
                      ) : (
                          <Badge variant="secondary" className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            Pessoa Física
                          </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1.5 text-muted-foreground">Atividades Registradas</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md bg-muted/50 p-3 text-center">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Total</p>
                        <p className="text-2xl font-bold">{activities.length}</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3 text-center">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Concluídas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {activities.filter(a => a.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                    onClick={() => navigate("/activities/new", { state: { clientId: id } })}
                    className="w-full"
                >
                  <List className="h-4 w-4 mr-2" />
                  Registrar Nova Atividade
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Contêiner para renderizar o template do PDF fora da tela (temporariamente visível para depuração) */}
        <div
            ref={pdfReportRef}
            style={{
                border: '2px solid #61dafbaa', // Para ver a caixa
                margin: '20px',         // Espaçamento
                width: '210mm',         // Mantenha a largura se quiser testar o layout A4
                height: 'auto',
                backgroundColor: '#eee' // Fundo para destacar
            }}
            aria-hidden="true"
        >
            {client && filteredActivities && collaborators && (
                <PdfReportTemplate
                    client={client}
                    activities={filteredActivities}
                    assignees={Object.entries(collaborators).reduce((acc, [id, user]) => { acc[id] = user.name || `Usuário ${id.substring(0, 5)}`; return acc; }, {} as Record<string, string>)}
                    emissionDate={new Date().toLocaleDateString('pt-BR')}
                />
            )}
        </div>
      </div>
  );
};

export default ClientDetailsPage;