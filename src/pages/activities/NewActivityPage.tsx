import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
    CalendarIcon,
    Loader2,
    Check, // Ícone para o item selecionado no Combobox
    ChevronsUpDown // Ícone para o botão do Combobox
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
} from "@/components/ui/select"; // Mantido para outros selects (Prioridade, Status)
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList, // Importante para scroll
} from "@/components/ui/command"; // Componentes para o Combobox
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
    createActivity,
    ActivityStatus,
    ActivityPriority
} from "@/services/firebase/activities";
import { getClients, Client } from "@/services/firebase/clients"; // Importa Client type
import { useAuth } from "@/contexts/AuthContext";

// --- CORREÇÃO NO SCHEMA ZOD ---
// endDate agora deve ser uma string não vazia
const formSchema = z.object({
    title: z.string().min(3, {
        message: "O título deve ter pelo menos 3 caracteres."
    }),
    description: z.string().min(10, {
        message: "A descrição deve ter pelo menos 10 caracteres."
    }),
    clientId: z.string({
        required_error: "Por favor, selecione um cliente."
    }).nonempty({ message: "Por favor, selecione um cliente." }), // Garante que não seja string vazia
    priority: z.string({
        required_error: "Por favor, selecione uma prioridade."
    }),
    status: z.string({
        required_error: "Por favor, selecione um status."
    }),
    startDate: z.string({ // Mantém como string 'yyyy-MM-dd'
        required_error: "Por favor, selecione uma data de início."
    }).nonempty({ message: "Por favor, selecione uma data de início." }), // Garante não vazia
    startTime: z.string({
        required_error: "Por favor, informe a hora de início."
    }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { // Valida HH:MM (00:00 - 23:59)
        message: "Formato de hora inválido (use HH:MM)."
    }),
    // CORRIGIDO: Usa .nonempty() para garantir que a string não seja vazia
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

const NewActivityPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            priority: "medium",
            status: "pending",
            startDate: format(new Date(), "yyyy-MM-dd"),
            startTime: "",
            endDate: "", // Valor inicial vazio ainda é ok, Zod validará na submissão
            endTime: "",
            type: "",
            clientId: "",
        },
    });

    // Validação condicional via useEffect foi removida anteriormente (correto)

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
                    description: "Não foi possível carregar os clientes."
                });
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [toast]);

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        // Zod agora garante que data.endDate é uma string não vazia antes de chamar onSubmit

        if (!user?.uid) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Usuário não autenticado."
            });
            return;
        }

        // Verificação condicional baseada no status foi removida anteriormente (correto)

        setIsSubmitting(true);

        try {
            // data.endDate é garantido como string não vazia pelo Zod
            const activityData: any = {
                title: data.title,
                description: data.description,
                clientId: data.clientId,
                assignedTo: [user.uid],
                priority: data.priority as ActivityPriority,
                status: data.status as ActivityStatus,
                type: data.type || "",
                createdBy: user.uid,
                startDate: new Date(`${data.startDate}T${data.startTime}:00`).toISOString(),
            };

            // Constrói a data/hora de término
            const timePart = data.endTime ? `${data.endTime}:00` : '00:00:00';
            try {
                // Esta linha agora é segura porque data.endDate não será ""
                activityData.endDate = new Date(`${data.endDate}T${timePart}`).toISOString();
            } catch (dateError) {
                // Este catch ainda é útil para casos de formato de data/hora realmente inválidos
                // que possam ter passado pelo picker (improvável mas possível)
                console.error("Erro ao converter data/hora de término:", dateError, "Valores:", data.endDate, data.endTime);
                toast({
                    variant: "destructive",
                    title: "Erro de Formato",
                    description: "A data ou hora de término fornecida parece inválida."
                });
                setIsSubmitting(false);
                return;
            }

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
                    {/* Título */}
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

                    {/* Tipo */}
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Tipo da atividade (opcional)" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Informe o tipo desta atividade (ex: Reunião, Desenvolvimento, Suporte).
                                </FormDescription>
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
                                        placeholder="Detalhe o que precisa ser feito nesta atividade."
                                        className="resize-none h-32"
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

                    {/* Cliente (Combobox) */}
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
                                                        // Adiciona verificação defensiva para companyName
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
                                                        // Adiciona verificação defensiva para companyName
                                                        const companyName = (client as any).companyName;
                                                        const displayValue = client.type === 'juridica' && companyName ? companyName : client.name;
                                                        return (
                                                            <CommandItem
                                                                value={displayValue} // Usar o valor que será exibido para busca
                                                                key={client.id}
                                                                onSelect={() => {
                                                                    form.setValue("clientId", client.id, { shouldValidate: true }); // Adiciona validação ao setar
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
                                <FormDescription>
                                    Selecione ou digite para buscar o cliente associado.
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

                    {/* Prioridade e Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Prioridade */}
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
                        {/* Status */}
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

                    {/* Data e Hora de Início */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Data de Início */}
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
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? (
                                                        format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR })
                                                    ) : (
                                                        <span>Selecione a data</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : '')} // Passa '' se desmarcado
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
                        {/* Hora de Início */}
                        <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hora de Início</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="time"
                                            className="w-32"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Informe a hora de início (HH:MM).
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Data e Hora de Término */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Data de Término */}
                        <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Data de Término <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? (
                                                        format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR })
                                                    ) : (
                                                        <span>Selecione a data</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : '')} // Passa '' se desmarcado
                                                disabled={(date) => {
                                                    const startDateValue = form.getValues("startDate");
                                                    return startDateValue ? date < new Date(`${startDateValue}T00:00:00`) : false;
                                                }}
                                                locale={ptBR}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        Selecione a data de término desta atividade.
                                    </FormDescription>
                                    {/* FormMessage exibirá o erro Zod (".nonempty") se o campo estiver vazio */}
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
                                            className="w-32"
                                            {...field}
                                            value={field.value || ""}
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

                    {/* Botões de Ação */}
                    <div className="flex justify-end gap-4">
                        <Link to="/activities">
                            <Button type="button" variant="outline">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={isLoadingData || isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando...
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