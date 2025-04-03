import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { 
  CalendarIcon, 
  Check, 
  ChevronsUpDown, 
  Loader2,
  AlertTriangle
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
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
import { getAllActiveUsers } from "@/services/firebase/auth";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";

// Definição do esquema de validação
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
  assignedToIds: z.array(z.string()).min(1, {
    message: "Selecione pelo menos um responsável."
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

// O resto da implementação segue...

const NewActivityPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Inicializar o formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedToIds: [],
      priority: "medium",
      status: "pending",
      startDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  // Carregar dados necessários
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        
        // Buscar clientes
        const fetchedClients = await getClients();
        setClients(fetchedClients);
        
        // Buscar colaboradores ativos
        const fetchedUsers = await getAllActiveUsers();
        setUsers(fetchedUsers);
        
        // Adicionar o usuário atual como responsável por padrão
        if (user?.uid) {
          form.setValue("assignedToIds", [user.uid]);
        }
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
  }, [form, toast, user]);

  // Função para lidar com o envio do formulário
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user?.uid) {
      toast({
        variant: "destructive", 
        title: "Erro", 
        description: "Usuário não autenticado."
      });
      return;
    }

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

      const activityData = {
        title: data.title,
        description: data.description,
        clientId: data.clientId,
        assignedTo: data.assignedToIds,
        priority: data.priority as ActivityPriority,
        status: data.status as ActivityStatus,
        startDate,
        endDate,
        createdBy: user.uid
      };

      await createActivity(activityData, user.uid);
      
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
        description: "Não foi possível criar a atividade."
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedToIds"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Responsável(eis)</FormLabel>
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
                          {field.value?.length > 0
                            ? users
                                .filter(user => field.value.includes(user.uid))
                                .map(user => user.name)
                                .join(", ")
                            : "Selecione os responsáveis"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar responsável..." />
                        <CommandEmpty>Nenhum responsável encontrado.</CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => (
                            <CommandItem
                              key={user.uid}
                              value={user.name}
                              onSelect={() => {
                                if (field.value?.includes(user.uid)) {
                                  field.onChange(field.value?.filter((f) => f !== user.uid));
                                } else {
                                  field.onChange([...(field.value || []), user.uid]);
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value?.includes(user.uid) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {user.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Selecione os responsáveis por esta atividade.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Início</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(format(date, "yyyy-MM-dd"))}
                        disabled={(date) =>
                          date > new Date()
                        }
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
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Término (Opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(format(date, "yyyy-MM-dd"))}
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

          <div className="flex justify-end">
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
