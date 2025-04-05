
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { 
  CalendarIcon, 
  Loader2
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays } from "date-fns";
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
import { getClients } from "@/services/firebase/clients";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// Modify the form schema to remove assignedToIds field
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
  startDate: z.string({
    required_error: "Por favor, selecione uma data de início."
  }),
  endDate: z.string().optional(),
});

const EditActivityPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);

  // Inicializar o formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      startDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  // Carregar dados necessários
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        
        // Buscar a atividade específica
        const fetchedActivity = await getActivityById(id);
        if (!fetchedActivity) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Atividade não encontrada"
          });
          navigate("/activities");
          return;
        }
        
        setActivity(fetchedActivity);
        
        // Buscar clientes
        const fetchedClients = await getClients();
        setClients(fetchedClients);
        
        // Preencher o formulário com os dados da atividade
        form.reset({
          title: fetchedActivity.title,
          description: fetchedActivity.description,
          clientId: fetchedActivity.clientId,
          priority: fetchedActivity.priority,
          status: fetchedActivity.status,
          startDate: fetchedActivity.startDate ? format(new Date(fetchedActivity.startDate), "yyyy-MM-dd") : "",
          endDate: fetchedActivity.endDate ? format(new Date(fetchedActivity.endDate), "yyyy-MM-dd") : undefined,
        });
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
  }, [id, form, toast, navigate]);

  // Função para lidar com o envio do formulário
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!id || !user?.uid) return;
    
    setIsSubmitting(true);

    try {
      // Ensure dates are stored in ISO format but preserve the selected date
      // This preserves the date by setting the time to noon in the local timezone
      // which prevents timezone shifts from changing the day
      const startDate = data.startDate 
        ? new Date(`${data.startDate}T12:00:00`).toISOString() 
        : '';
        
      const endDate = data.endDate 
        ? new Date(`${data.endDate}T12:00:00`).toISOString() 
        : undefined;

      // Keep the original assignees when updating an activity
      const activityData = {
        title: data.title,
        description: data.description,
        clientId: data.clientId,
        priority: data.priority as ActivityPriority,
        status: data.status as ActivityStatus,
        startDate,
        endDate,
      };

      await updateActivity(id, activityData);
      
      toast({
        title: "Atividade atualizada",
        description: "A atividade foi atualizada com sucesso.",
      });
      
      navigate(`/activities/${id}`);
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

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <Link to="/activities" className="text-blue-500 hover:underline">
          Voltar para Atividades
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-4">
        Editar Atividade
      </h1>

      {isLoadingData ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-8 w-1/4" />
        </div>
      ) : (
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhe o que será feito nesta atividade"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Forneça o máximo de detalhes possível sobre a atividade.
                  </FormDescription>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.type === 'juridica'
                            ? (client as any).companyName
                            : client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecione o cliente associado a esta atividade.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col md:flex-row gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="flex-1">
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
                      Defina a prioridade desta atividade.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex-1">
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
                      Defina o status desta atividade.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                      <FormItem className="flex-1"> {/* ou className="flex flex-col" dependendo do seu layout */}
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
                                    // MODIFICAÇÃO AQUI: Adicione T12:00:00
                                    format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR })
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
                                // MODIFICAÇÃO AQUI: Adicione T12:00:00
                                selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
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

              <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                      <FormItem className="flex-1"> {/* ou className="flex flex-col" dependendo do seu layout */}
                        <FormLabel>Data de Término (Opcional)</FormLabel>
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
                                    // MODIFICAÇÃO AQUI: Adicione T12:00:00
                                    format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR })
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
                                // MODIFICAÇÃO AQUI: Adicione T12:00:00
                                selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
                                disabled={(date) => {
                                  const startDateValue = form.getValues("startDate");
                                  // MODIFICAÇÃO AQUI: Adicione T12:00:00 também na comparação se necessário
                                  // (Embora 'date < new Date(...)' possa já funcionar corretamente se 'date' for local)
                                  // Para segurança, pode-se comparar strings ou normalizar ambas as datas
                                  return startDateValue ? date < new Date(`${startDateValue}T00:00:00`) : false; // Comparar com início do dia
                                }}
                                locale={ptBR}
                                initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Selecione a data de término desta atividade, se aplicável.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                  )}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar Atividade
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
};

export default EditActivityPage;
