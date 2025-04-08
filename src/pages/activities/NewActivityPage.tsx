import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { 
  CalendarIcon, 
  Loader2
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
  createActivity, 
  ActivityStatus, 
  ActivityPriority 
} from "@/services/firebase/activities";
import { getClients } from "@/services/firebase/clients";
import { useAuth } from "@/contexts/AuthContext";

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
    startDate: z.string({ // Mantém como string 'yyyy-MM-dd'
        required_error: "Por favor, selecione uma data de início."
    }),
    // NOVO: Campo para hora de início (obrigatório, formato HH:MM)
    startTime: z.string({
        required_error: "Por favor, informe a hora de início."
    }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { // Valida HH:MM (00:00 - 23:59)
        message: "Formato de hora inválido (use HH:MM)."
    }),
    endDate: z.string().optional(), // Mantém como string 'yyyy-MM-dd', opcional
    // NOVO: Campo para hora de término (opcional, formato HH:MM)
    endTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { // Valida HH:MM se preenchido
            message: "Formato de hora inválido (use HH:MM)."
        })
        .optional()
        .or(z.literal("")), // Permite vazio ou formato HH:MM
    type: z.string().optional(),
});

const NewActivityPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
          title: "",
          description: "",
          priority: "medium",
          status: "pending",
          startDate: format(new Date(), "yyyy-MM-dd"), // Data de hoje como padrão
          startTime: "", // Vazio por padrão, ou defina um como "09:00"
          endDate: "",   // Vazio por padrão
          endTime: "",   // Vazio por padrão
          type: "",
          // clientId não precisa de valor padrão aqui se o Select lida com isso
      },
  });

  const watchStatus = form.watch("status");
  const watchEndDate = form.watch("endDate");

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        
        const fetchedClients = await getClients();
        setClients(fetchedClients);
        
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os dados necessários."
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user?.uid) {
      toast({
        variant: "destructive", 
        title: "Erro", 
        description: "Usuário não autenticado."
      });
      return;
    }

    if (data.status === 'completed' && !data.endDate) {
      form.setError("endDate", {
        type: "manual",
        message: "Data de término é obrigatória para atividades concluídas."
      });
      toast({
        variant: "destructive",
        title: "Erro de validação",
        description: "Atividades concluídas precisam ter uma data de término definida."
      });
      return;
    }

    setIsSubmitting(true);

      try {
          // 1. Monta o objeto base
          const activityData: any = {
              title: data.title,
              description: data.description,
              clientId: data.clientId,
              assignedTo: [user.uid], // Assumindo que sempre é o criador inicialmente
              priority: data.priority as ActivityPriority,
              status: data.status as ActivityStatus,
              type: data.type || "", // Garante que seja string vazia se opcional e não preenchido
              createdBy: user.uid,
              // MODIFICADO: Combina data e hora de início (obrigatórios)
              startDate: new Date(`${data.startDate}T${data.startTime}:00`).toISOString(),
          };

          // 2. Adiciona endDate SOMENTE se data.endDate tiver valor
          if (data.endDate) {
              // Usa a hora de término se fornecida, senão usa 00:00:00 como padrão
              const timePart = data.endTime ? `${data.endTime}:00` : '00:00:00';
              try {
                  // MODIFICADO: Combina data e hora de término
                  activityData.endDate = new Date(`${data.endDate}T${timePart}`).toISOString();
              } catch (dateError) {
                  console.error("Erro ao converter data/hora de término:", dateError, "Valores:", data.endDate, data.endTime);
                  toast({
                      variant: "destructive",
                      title: "Erro de Formato",
                      description: "A data ou hora de término fornecida parece inválida."
                  });
                  setIsSubmitting(false);
                  return;
              }
          }
          // Se data.endDate for vazio/undefined, o campo 'endDate' não será adicionado

          // console.log("Dados a serem enviados:", activityData); // BOM PARA DEBUG

          // 3. Chame createActivity com o objeto atualizado
          await createActivity(activityData, user.uid); // Assumindo que createActivity aceita o objeto e o uid

          toast({
              title: "Atividade criada",
              description: "A atividade foi criada com sucesso.",
          });

          navigate("/activities");
      } catch (error) {
          console.error("Erro ao criar atividade:", error);
          toast({
              variant: "destructive",
              title: "Erro",
              description: "Não foi possível criar a atividade." // Mensagem genérica
          });
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Nova Atividade</h1>
        <p className="text-muted-foreground">
          Crie uma nova atividade para sua equipe.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Título da atividade" {...field} />
                </FormControl>
                <FormDescription>
                  Dê um nome claro e conciso para esta atividade.
                </FormDescription>
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
                <FormControl>
                  <Input placeholder="Tipo da atividade" {...field} />
                </FormControl>
                <FormDescription>
                  Informe o tipo desta atividade (ex: Reunião, Desenvolvimento, Suporte).
                </FormDescription>
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
                <FormControl>
                  <Textarea
                    placeholder="Detalhe o que precisa ser feito nesta atividade."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Forneça o máximo de detalhes possível.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.type === 'juridica' ? (client as any).companyName : client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecione o cliente associado a esta atividade.
                  </FormDescription>

                    <Link
                        to="/clients/new"
                        className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                    >
                        Gostaria de cadastrar um novo cliente?
                    </Link>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecione o nível de prioridade desta atividade.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in-progress">Em Progresso</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecione o status inicial desta atividade.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

              {/* Agrupando Data e Hora de Início (Exemplo com Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* FormField da Data de Início (existente, sem alterações internas) */}
                  <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                          <FormItem> {/* Removido flex-1 se estiver dentro de um grid */}
                              <FormLabel>Data de Início</FormLabel>
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <FormControl>
                                          <Button
                                              variant={"outline"}
                                              className={cn(
                                                  "w-full pl-3 text-left font-normal",
                                                  !field.value && "text-muted-foreground"
                                              )}
                                          >
                                              {field.value ? (
                                                  format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR }) // Mantém T12 para exibição
                                              ) : (
                                                  <span>Selecione a data</span>
                                              )}
                                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                          </Button>
                                      </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                          mode="single"
                                          selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined} // Mantém T12 para seleção
                                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
                                          locale={ptBR}
                                          initialFocus
                                      />
                                  </PopoverContent>
                              </Popover>
                              <FormDescription>
                                  Selecione a data de início desta atividade.
                              </FormDescription>
                              <FormMessage />
                          </FormItem>
                      )}
                  />

                  {/* NOVO: FormField da Hora de Início */}
                  {/* CORRIGIDO: FormField da Hora de Início (usando input type="time" nativo estilizado) */}
                  <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                          <FormItem> {/* Removido flex-1 */}
                              <FormLabel>
                                  Data de Término
                                  {watchStatus === 'completed' ? ' (Obrigatório)' : ' (Opcional)'}
                              </FormLabel>
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <FormControl>
                                          <Button
                                              variant={"outline"}
                                              className={cn(
                                                  "w-full pl-3 text-left font-normal",
                                                  !field.value && "text-muted-foreground"
                                              )}
                                          >
                                              {field.value ? (
                                                  format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR }) // Mantém T12 para exibição
                                              ) : (
                                                  <span>Selecione a data</span>
                                              )}
                                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                          </Button>
                                      </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                          mode="single"
                                          selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined} // Mantém T12 para seleção
                                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
                                          disabled={(date) => {
                                              const startDateValue = form.getValues("startDate");
                                              // A lógica de desabilitar datas anteriores à data de início
                                              // pode precisar considerar a hora de início também,
                                              // mas para simplificar, manteremos a comparação apenas de data.
                                              return startDateValue ? date < new Date(`${startDateValue}T00:00:00`) : false;
                                          }}
                                          locale={ptBR}
                                          initialFocus
                                      />
                                  </PopoverContent>
                              </Popover>
                              <FormDescription>
                                  {watchStatus === 'completed'
                                      ? 'Data de término é obrigatória para atividades concluídas.'
                                      : 'Selecione a data de término (opcional).'}
                              </FormDescription>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              </div>

              {/* Agrupando Data e Hora de Término (Exemplo com Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* FormField da Data de Término (existente, ajustar label e descrição) */}
                  <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                          <FormItem> {/* Mantenha ou ajuste classes de layout */}
                              <FormLabel>Hora de Início</FormLabel>
                              <FormControl>
                                  {/* Simplesmente use Input com type="time" */}
                                  <Input
                                      type="time"
                                      {...field}
                                      className="w-20" // Descomente se precisar forçar largura total explicitamente
                                  />
                              </FormControl>
                              <FormDescription>
                                  Informe a hora de início (HH:MM).
                              </FormDescription>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  {/* NOVO: FormField da Hora de Término */}
                  {/* CORRIGIDO: FormField da Hora de Término (usando input type="time" nativo estilizado) */}
                  <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                          <FormItem> {/* Mantenha ou ajuste classes de layout */}
                              <FormLabel>Hora de Término (Opcional)</FormLabel>
                              <FormControl>
                                  {/* Simplesmente use Input com type="time" */}
                                  <Input
                                      type="time"
                                      {...field}
                                      // Garante que o valor seja uma string vazia se nulo/undefined,
                                      // o que é importante para inputs controlados.
                                      value={field.value || ""}
                                      className="w-20" // Descomente se precisar forçar largura total explicitamente
                                  />
                              </FormControl>
                              <FormDescription>
                                  Informe a hora de término (HH:MM), se aplicável.
                              </FormDescription>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link to="/activities">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={isLoadingData || isSubmitting}>
              {isSubmitting ? (
                <>
                  Criando...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Criar Atividade"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewActivityPage;
