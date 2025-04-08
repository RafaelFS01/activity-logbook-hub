import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  CalendarIcon,
  Loader2
  // ClockIcon não é mais necessário se usamos type="time" nativo
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  updateActivity,
  getActivityById,
  ActivityStatus,
  ActivityPriority,
  Activity
} from "@/services/firebase/activities";
import { getClients, Client } from "@/services/firebase/clients"; // Assumindo que Client está exportado
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// 1. Atualizar Schema Zod
const formSchema = z.object({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres."
  }),
  description: z.string().min(10, {
    message: "A descrição deve ter pelo menos 10 caracteres."
  }),
  clientId: z.string({
    required_error: "Por favor, selecione um cliente."
  }),
  priority: z.string({
    required_error: "Por favor, selecione uma prioridade."
  }),
  status: z.string({
    required_error: "Por favor, selecione um status."
  }),
  startDate: z.string({ // Data como 'yyyy-MM-dd'
    required_error: "Por favor, selecione uma data de início."
  }),
  // NOVO: Campo de hora de início
  startTime: z.string({
    required_error: "Por favor, informe a hora de início."
  }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Formato de hora inválido (use HH:MM)."
  }),
  endDate: z.string().optional(), // Data como 'yyyy-MM-dd', opcional
  // NOVO: Campo de hora de término
  endTime: z.string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: "Formato de hora inválido (use HH:MM)."
      })
      .optional()
      .or(z.literal("")), // Permite vazio ou formato HH:MM
  type: z.string().optional(),
});

// Inferir o tipo do schema atualizado
type EditActivityFormData = z.infer<typeof formSchema>;

const EditActivityPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]); // Tipar o estado dos clientes
  const [isLoadingData, setIsLoadingData] = useState(true);
  // Removido estado 'activity', pois os dados vão direto pro form via reset

  // 2. Atualizar useForm com novos campos e tipo inferido
  const form = useForm<EditActivityFormData>({
    resolver: zodResolver(formSchema),
    // Os defaultValues serão sobrescritos pelo reset, mas é bom tê-los
    defaultValues: {
      title: "",
      description: "",
      clientId: "",
      priority: "medium",
      status: "pending",
      startDate: "", // Será preenchido no useEffect
      startTime: "", // Será preenchido no useEffect
      endDate: "",   // Será preenchido no useEffect
      endTime: "",   // Será preenchido no useEffect
      type: "",
    },
  });

  const watchStatus = form.watch("status");
  const watchEndDate = form.watch("endDate"); // Monitora a data, não a hora

  // Lógica condicional para endDate (sem alterações)
  useEffect(() => {
    if (watchStatus === "completed" && !watchEndDate) {
      form.setError("endDate", {
        type: "manual",
        message: "Data de término é obrigatória para atividades concluídas."
      });
    } else {
      form.clearErrors("endDate");
    }
  }, [watchStatus, watchEndDate, form]);

  // 3. Atualizar useEffect de busca e preenchimento (form.reset)
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        toast({ variant: "destructive", title: "Erro", description: "ID da atividade não encontrado." });
        navigate("/activities");
        return;
      };

      try {
        setIsLoadingData(true);

        // Busca atividade e clientes em paralelo para otimizar
        const [fetchedActivity, fetchedClients] = await Promise.all([
          getActivityById(id),
          getClients()
        ]);

        if (!fetchedActivity) {
          toast({ variant: "destructive", title: "Erro", description: "Atividade não encontrada" });
          navigate("/activities");
          return;
        }

        setClients(fetchedClients);

        // Extrair data E HORA dos campos da atividade buscada
        const startDateStr = fetchedActivity.startDate
            ? format(new Date(fetchedActivity.startDate), "yyyy-MM-dd")
            : "";
        const startTimeStr = fetchedActivity.startDate
            ? format(new Date(fetchedActivity.startDate), "HH:mm")
            : ""; // Pega HH:mm

        const endDateStr = fetchedActivity.endDate
            ? format(new Date(fetchedActivity.endDate), "yyyy-MM-dd")
            : undefined; // undefined para campo opcional vazio
        const endTimeStr = fetchedActivity.endDate
            ? format(new Date(fetchedActivity.endDate), "HH:mm")
            : ""; // Pega HH:mm ou string vazia

        // Usar form.reset para preencher TODOS os campos
        form.reset({
          title: fetchedActivity.title,
          description: fetchedActivity.description,
          clientId: fetchedActivity.clientId,
          priority: fetchedActivity.priority,
          status: fetchedActivity.status,
          startDate: startDateStr,
          startTime: startTimeStr, // Preenche a hora de início
          endDate: endDateStr,
          endTime: endTimeStr,     // Preenche a hora de término
          type: fetchedActivity.type || "",
        });

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados necessários." });
        // Considerar redirecionar ou mostrar mensagem mais específica
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [id, form, toast, navigate]); // form é dependência do reset

  // 4. Atualizar onSubmit para incluir startTime e endTime
  const onSubmit = async (data: EditActivityFormData) => {
    if (!user?.uid || !id) {
      toast({ variant: "destructive", title: "Erro", description: "Informações de usuário ou atividade ausentes." });
      return;
    }

    // Validação da data de término se status for 'completed' (sem alterações)
    if (data.status === 'completed' && !data.endDate) {
      form.setError("endDate", { type: "manual", message: "Data de término é obrigatória para atividades concluídas." });
      toast({ variant: "destructive", title: "Erro de validação", description: "Atividades concluídas precisam ter uma data de término definida." });
      return;
    }

    setIsSubmitting(true);

    try {
      // Combina startDate e startTime (ambos obrigatórios pelo schema)
      const finalStartDate = new Date(`${data.startDate}T${data.startTime}:00`).toISOString();

      // Combina endDate e endTime (se endDate existir)
      let finalEndDate: string | null = null; // Default para null
      if (data.endDate) {
        // Usa a hora de término se fornecida, senão usa 00:00:00
        const timePart = data.endTime ? `${data.endTime}:00` : '00:00:00';
        try {
          finalEndDate = new Date(`${data.endDate}T${timePart}`).toISOString();
        } catch (dateError) {
          console.error("Erro ao converter data/hora de término:", dateError, "Valores:", data.endDate, data.endTime);
          toast({ variant: "destructive", title: "Erro de Formato", description: "A data ou hora de término fornecida parece inválida." });
          setIsSubmitting(false);
          return;
        }
      }
      // Se data.endDate for vazio, finalEndDate permanece null

      // Objeto com os dados a serem atualizados
      const updatedData = {
        title: data.title,
        description: data.description,
        clientId: data.clientId,
        priority: data.priority as ActivityPriority,
        status: data.status as ActivityStatus,
        startDate: finalStartDate, // Envia ISOString combinada
        type: data.type || "",     // Garante string vazia se opcional
        endDate: finalEndDate,     // Envia ISOString combinada ou null
        // Adicionar campos de auditoria se desejado:
        // updatedAt: new Date().toISOString(),
        // updatedBy: user.uid,
      };

      await updateActivity(id, updatedData);

      toast({
        title: "Atividade atualizada",
        description: "A atividade foi atualizada com sucesso.",
      });

      navigate("/activities");
    } catch (error) {
      console.error("Erro ao atualizar atividade:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a atividade."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Atualizar JSX para incluir os campos de hora com largura reduzida
  return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <Link to="/activities" className="text-sm text-blue-600 hover:underline">
            ← Voltar para Atividades
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6">
          Editar Atividade
        </h1>

        {isLoadingData ? (
            // Skeleton Loader (sem alterações)
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
        ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Campos Título, Tipo, Descrição, Cliente (sem alterações) */}
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl><Input placeholder="Título da atividade" {...field} /></FormControl>
                          <FormDescription>Dê um nome claro para a atividade.</FormDescription>
                          <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <FormControl><Input placeholder="Tipo da atividade (opcional)" {...field} value={field.value || ''} /></FormControl>
                          <FormDescription>Ex: Reunião, Desenvolvimento.</FormDescription>
                          <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl><Textarea placeholder="Detalhes da atividade" className="resize-none" {...field} /></FormControl>
                          <FormDescription>Forneça detalhes sobre a atividade.</FormDescription>
                          <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}> {/* Usar value aqui */}
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.type === 'juridica' ? client.companyName : client.name}
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Cliente associado à atividade.</FormDescription>
                          <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Linha para Prioridade e Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridade</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}> {/* Usar value */}
                              <FormControl><SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="medium">Média</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}> {/* Usar value */}
                              <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="in-progress">Em Progresso</SelectItem>
                                <SelectItem value="completed">Concluída</SelectItem>
                                <SelectItem value="cancelled">Cancelada</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>

                {/* Linha para Data e Hora de Início */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"> {/* items-start para alinhar labels */}
                  {/* Data de Início */}
                  <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                          <FormItem> {/* Não precisa de flex-1 se no grid */}
                            <FormLabel>Data de Início</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                      variant={"outline"}
                                      className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR }) : <span>Selecione</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
                                    locale={ptBR}
                                    initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                  {/* Hora de Início */}
                  <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                          <FormItem> {/* Campo ocupa espaço no grid */}
                            <FormLabel>Hora de Início</FormLabel>
                            <FormControl>
                              <Input
                                  type="time"
                                  className="w-32" // Largura reduzida
                                  {...field}
                                  value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>

                {/* Linha para Data e Hora de Término */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Data de Término */}
                  <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Data de Término
                              {watchStatus === 'completed' ? <span className="text-destructive">*</span> : ' (Opcional)'}
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                      variant={"outline"}
                                      className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR }) : <span>Selecione</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
                                    disabled={(date) => {
                                      const startDateValue = form.getValues("startDate");
                                      return startDateValue ? date < new Date(`${startDateValue}T00:00:00`) : false;
                                    }}
                                    locale={ptBR}
                                    initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                  {/* Hora de Término */}
                  <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora de Término (Opcional)</FormLabel>
                            <FormControl>
                              <Input
                                  type="time"
                                  className="w-32" // Largura reduzida
                                  {...field}
                                  value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>

                {/* Botão de Submissão */}
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting || isLoadingData}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Atualizar Atividade
                  </Button>
                </div>
              </form>
            </Form>
        )}
      </div>
  );
};

export default EditActivityPage;