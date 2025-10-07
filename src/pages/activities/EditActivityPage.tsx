import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  CalendarIcon,
  Loader2,
  Check, // Ícone para o item selecionado no Combobox (Se for usar Combobox para cliente)
  ChevronsUpDown, // Ícone para o botão do Combobox (Se for usar Combobox para cliente)
  FileEdit,
  ArrowLeft
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isValid } from "date-fns"; // Importa isValid
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
// Removido Select para cliente, caso decida usar Combobox como no NewActivityPage
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Adicionar imports do Command se for usar Combobox para cliente
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
// Mantido Select para Prioridade e Status
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  updateActivity,
  getActivityById,
  ActivityStatus,
  ActivityPriority,
  // Activity // Não é mais necessário importar Activity se usamos o tipo inferido
} from "@/services/firebase/activities";
import { getClients, Client } from "@/services/firebase/clients";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// --- MODIFICAÇÃO 1: Schema Zod ---
// endDate agora é sempre obrigatório e não vazio
const formSchema = z.object({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres."
  }),
  description: z.string().min(10, {
    message: "A descrição deve ter pelo menos 10 caracteres."
  }),
  clientId: z.string({
    required_error: "Por favor, selecione um cliente."
  }).nonempty({ message: "Por favor, selecione um cliente." }), // Garante não vazio
  priority: z.string({
    required_error: "Por favor, selecione uma prioridade."
  }),
  status: z.string({
    required_error: "Por favor, selecione um status."
  }),
  startDate: z.string({
    required_error: "Por favor, selecione uma data de início."
  }).nonempty({ message: "Por favor, selecione uma data de início." }), // Garante não vazio
  startTime: z.string({
    required_error: "Por favor, informe a hora de início."
  }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Formato de hora inválido (use HH:MM)."
  }),
  // MODIFICADO: endDate agora é obrigatório e não vazio
  endDate: z.string({
    required_error: "Por favor, selecione uma data de término." // Mensagem se undefined/null
  }).nonempty({
    message: "Por favor, selecione uma data de término." // Mensagem se string vazia ""
  }),
  endTime: z.string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { // Valida HH:MM se preenchido
        message: "Formato de hora inválido (use HH:MM)."
      })
      .optional()
      .or(z.literal("")), // Permite vazio ou formato HH:MM (mantido opcional)
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
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  // const [openCombobox, setOpenCombobox] = useState(false); // Se usar Combobox para cliente

  const form = useForm<EditActivityFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { // Default values são úteis antes do reset
      title: "",
      description: "",
      clientId: "",
      priority: "medium",
      status: "pending",
      startDate: "",
      startTime: "",
      endDate: "", // Inicialmente vazio, será validado pelo Zod
      endTime: "",
      type: "",
    },
  });

  // --- MODIFICAÇÃO 2: Remoção do useEffect condicional ---
  // const watchStatus = form.watch("status"); // Não é mais necessário para a validação de endDate
  // const watchEndDate = form.watch("endDate"); // Não é mais necessário
  // Este useEffect foi removido pois a validação agora é feita diretamente pelo Zod
  // useEffect(() => {
  //     if (watchStatus === "completed" && !watchEndDate) { /* ... */ }
  // }, [watchStatus, watchEndDate, form]);

  // --- MODIFICAÇÃO 5: Atualização do useEffect de busca e preenchimento ---
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        toast({ variant: "destructive", title: "Erro", description: "ID da atividade não encontrado." });
        navigate("/activities");
        return;
      };

      try {
        setIsLoadingData(true);
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

        // Helper para formatar data/hora de forma segura
        const formatDate = (dateString: string | undefined | null): string => {
          if (!dateString) return "";
          const date = new Date(dateString);
          return isValid(date) ? format(date, "yyyy-MM-dd") : "";
        };
        const formatTime = (dateString: string | undefined | null): string => {
          if (!dateString) return "";
          const date = new Date(dateString);
          return isValid(date) ? format(date, "HH:mm") : "";
        };

        // Formata os valores para o formulário, garantindo strings vazias se inválido/nulo
        const startDateStr = formatDate(fetchedActivity.startDate);
        const startTimeStr = formatTime(fetchedActivity.startDate);
        const endDateStr = formatDate(fetchedActivity.endDate); // Será "" se endDate for nulo/inválido
        const endTimeStr = formatTime(fetchedActivity.endDate); // Será "" se endDate for nulo/inválido

        form.reset({
          title: fetchedActivity.title,
          description: fetchedActivity.description,
          clientId: fetchedActivity.clientId,
          priority: fetchedActivity.priority,
          status: fetchedActivity.status,
          startDate: startDateStr,
          startTime: startTimeStr,
          // endDate será "" se não existir no Firebase ou for inválido.
          // A validação Zod (.nonempty) exigirá que o usuário preencha ao salvar.
          endDate: endDateStr,
          endTime: endTimeStr,
          type: fetchedActivity.type || "",
        });

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados da atividade." });
        navigate("/activities"); // Redireciona em caso de erro grave
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [id, form, toast, navigate]);

  // --- MODIFICAÇÃO 3 & 6: Atualização do onSubmit ---
  const onSubmit = async (data: EditActivityFormData) => {
    // Zod já garantiu que data.endDate é uma string não vazia

    if (!user?.uid || !id) {
      toast({ variant: "destructive", title: "Erro", description: "Informações de usuário ou atividade ausentes." });
      return;
    }

    // Verificação condicional baseada no status foi removida

    setIsSubmitting(true);

    try {
      // Combina startDate e startTime (ambos garantidos pelo Zod como não vazios)
      const finalStartDate = new Date(`${data.startDate}T${data.startTime}:00`).toISOString();

      // Combina endDate e endTime (endDate garantido como não vazio pelo Zod)
      const timePart = data.endTime ? `${data.endTime}:00` : '00:00:00'; // Default time se endTime não for fornecido
      let finalEndDate: string;
      try {
        // Esta linha agora é segura porque data.endDate não será ""
        finalEndDate = new Date(`${data.endDate}T${timePart}`).toISOString();
      } catch (dateError) {
        console.error("Erro ao converter data/hora de término:", dateError, "Valores:", data.endDate, data.endTime);
        toast({ variant: "destructive", title: "Erro de Formato", description: "A data ou hora de término fornecida parece inválida." });
        setIsSubmitting(false);
        return;
      }

      // Objeto com os dados a serem atualizados
      const updatedData = {
        title: data.title,
        description: data.description,
        clientId: data.clientId,
        priority: data.priority as ActivityPriority,
        status: data.status as ActivityStatus,
        startDate: finalStartDate, // Envia ISOString combinada
        endDate: finalEndDate,     // Envia ISOString combinada (sempre presente)
        type: data.type || "",
        // Poderia adicionar campos de auditoria
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

  // --- MODIFICAÇÃO 4: Atualização do JSX (Label/Description de endDate) ---
  return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileEdit className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Editar Atividade</h1>
                <p className="text-muted-foreground mt-1 leading-relaxed">
                  Modifique as informações da atividade selecionada
                </p>
              </div>
            </div>

            <Link
              to="/activities"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Atividades
            </Link>
          </div>
        </div>


        {isLoadingData ? (
            // Skeleton Loader
            <div className="space-y-8"> {/* Aumenta espaço entre skeletons */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" /> {/* Label */}
                <Skeleton className="h-60 w-full" /> {/* Textarea */}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Select */}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" /> {/* Label */}
                  <Skeleton className="h-10 w-full" /> {/* Select */}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" /> {/* Label */}
                  <Skeleton className="h-10 w-full" /> {/* Select */}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" /> {/* Label */}
                  <Skeleton className="h-10 w-full" /> {/* Date */}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" /> {/* Label */}
                  <Skeleton className="h-10 w-32" /> {/* Time */}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" /> {/* Label */}
                  <Skeleton className="h-10 w-full" /> {/* Date */}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" /> {/* Label */}
                  <Skeleton className="h-10 w-32" /> {/* Time */}
                </div>
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-10 w-32" /> {/* Button */}
              </div>
            </div>
        ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Título */}
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
                {/* Tipo */}
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
                {/* Descrição */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                                placeholder="Detalhes da atividade"
                                className="resize-none h-60" // Altura consistente
                                {...field}
                            />
                          </FormControl>
                          <FormDescription>Forneça detalhes sobre a atividade.</FormDescription>
                          <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Cliente (Usando Combobox como exemplo, igual ao NewActivity) */}
                {/* Se preferir manter o Select simples, reverta para a versão anterior deste campo */}
                <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Cliente</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                        "w-full justify-between",
                                        !field.value && "text-muted-foreground"
                                    )}
                                >
                                  {field.value
                                      ? (() => {
                                        const client = clients.find(c => c.id === field.value);
                                        if (!client) return "Selecione um cliente";
                                        const companyName = (client as any).companyName;
                                        return client.type === 'juridica' && companyName ? companyName : client.name;
                                      })()
                                      : "Selecione um cliente"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar cliente..." />
                                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {clients.map((client) => {
                                      const companyName = (client as any).companyName;
                                      const displayValue = client.type === 'juridica' && companyName ? companyName : client.name;
                                      return (
                                          <CommandItem
                                              value={displayValue}
                                              key={client.id}
                                              onSelect={() => {
                                                form.setValue("clientId", client.id, { shouldValidate: true });
                                              }}
                                          >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    field.value === client.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {displayValue}
                                          </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormDescription>Cliente associado à atividade.</FormDescription>
                          <FormMessage />
                        </FormItem>
                    )}
                />


                {/* Prioridade e Status (usando Select normal) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridade</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="medium">Média</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Nível de prioridade.</FormDescription>
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="in-progress">Em Progresso</SelectItem>
                                <SelectItem value="completed">Concluída</SelectItem>
                                <SelectItem value="cancelled">Cancelada</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Status atual.</FormDescription>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>

                {/* Data e Hora de Início */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Início</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                      variant={"outline"}
                                      className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : '')} // Passa '' se desmarcar
                                    locale={ptBR}
                                    initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>Data de início da atividade.</FormDescription>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora de Início</FormLabel>
                            <FormControl>
                              <Input type="time" className="w-32" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>Hora (HH:MM).</FormDescription>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>

                {/* Data e Hora de Término (UI Modificada) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                          <FormItem>
                            {/* MODIFICADO: Label indica obrigatoriedade sempre */}
                            <FormLabel>
                              Data de Término <span className="text-destructive">*</span>
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                      variant={"outline"}
                                      className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : '')} // Passa '' se desmarcar
                                    disabled={(date) => {
                                      const startDateValue = form.getValues("startDate");
                                      return startDateValue ? date < new Date(`${startDateValue}T00:00:00`) : false;
                                    }}
                                    locale={ptBR}
                                    initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {/* MODIFICADO: Descrição simples */}
                            <FormDescription>Data de término da atividade.</FormDescription>
                            <FormMessage /> {/* Exibirá erro Zod se vazio */}
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora de Término (Opcional)</FormLabel>
                            <FormControl>
                              <Input type="time" className="w-32" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>Hora (HH:MM).</FormDescription>
                            <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>

                {/* Botão de Submissão */}
                <div className="flex justify-end gap-4">
                  <Link to="/activities">
                    <Button type="button" variant="outline">Cancelar</Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting || isLoadingData}>
                    {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Atualizando...
                        </>
                    ) : (
                        "Atualizar Atividade"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
        )}
      </div>
  );
};

export default EditActivityPage;