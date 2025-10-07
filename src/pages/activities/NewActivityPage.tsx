import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
    CalendarIcon,
    Loader2,
    Check, // Ícone para o item selecionado no Combobox
    ChevronsUpDown, // Ícone para o botão do Combobox
    PlusCircle // Ícone para criar novo tipo
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
    ActivityPriority,
    getActivityTypes // <<< Importa função para buscar tipos
} from "@/services/firebase/activities";
import { getClients, Client } from "@/services/firebase/clients"; // Importa Client type
import { useAuth } from "@/contexts/AuthContext";

// --- Schema Zod (sem alterações necessárias para 'type') ---
const formSchema = z.object({
    title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }),
    description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres." }),
    clientId: z.string({ required_error: "Por favor, selecione um cliente." })
        .nonempty({ message: "Por favor, selecione um cliente." }),
    priority: z.string({ required_error: "Por favor, selecione uma prioridade." }),
    status: z.string({ required_error: "Por favor, selecione um status." }),
    startDate: z.string({ required_error: "Por favor, selecione uma data de início." })
        .nonempty({ message: "Por favor, selecione uma data de início." }),
    startTime: z.string({ required_error: "Por favor, informe a hora de início." })
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (use HH:MM)." }),
    endDate: z.string({ required_error: "Por favor, selecione uma data de término." })
        .nonempty({ message: "Por favor, selecione uma data de término." }),
    endTime: z.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (use HH:MM)." })
        .optional()
        .or(z.literal("")),
    // Tipo agora pode ser qualquer string (existente ou nova) ou vazio/undefined
    type: z.string().optional(),
});

const NewActivityPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true); // Estado para carregamento de clientes

    // --- Estados para o Combobox de Tipo ---
    const [activityTypes, setActivityTypes] = useState<string[]>([]);
    const [isLoadingTypes, setIsLoadingTypes] = useState(true); // Estado para carregamento de tipos
    const [typeSearchValue, setTypeSearchValue] = useState(""); // Valor da busca no input do tipo
    const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false); // Controla o popover do tipo

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
            type: "", // Valor inicial do tipo continua vazio
            clientId: "",
        },
    });

    // --- Efeito para buscar Clientes e Tipos ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingClients(true);
            setIsLoadingTypes(true);
            try {
                // Busca clientes e tipos em paralelo
                const [fetchedClients, fetchedTypes] = await Promise.all([
                    getClients(),
                    getActivityTypes()
                ]);
                setClients(fetchedClients);
                // Garante que os tipos sejam únicos e ordena alfabeticamente
                setActivityTypes([...new Set(fetchedTypes)].sort((a, b) => a.localeCompare(b)));
            } catch (error) {
                console.error("Erro ao carregar dados iniciais:", error);
                toast({
                    variant: "destructive",
                    title: "Erro ao Carregar Dados",
                    description: "Não foi possível carregar clientes ou tipos de atividade."
                });
                // Mesmo com erro em um, podemos ter carregado o outro, então finalizamos ambos loadings
                setClients([]); // Limpa para evitar dados inconsistentes
                setActivityTypes([]);
            } finally {
                // Finaliza ambos os loadings independentemente do resultado
                setIsLoadingClients(false);
                setIsLoadingTypes(false);
            }
        };

        fetchData();
    }, [toast]); // Dependência apenas do toast para exibição de erros

    // --- onSubmit (sem alterações lógicas necessárias aqui, apenas usa data.type) ---
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
            const activityData: any = {
                title: data.title,
                description: data.description,
                clientId: data.clientId,
                assignedTo: [user.uid],
                priority: data.priority as ActivityPriority,
                status: data.status as ActivityStatus,
                // Inclui o tipo (seja ele existente ou novo, removendo espaços extras)
                type: data.type?.trim() || "", // <<< Garante que envie string vazia se não preenchido/só espaços
                createdBy: user.uid,
                startDate: new Date(`${data.startDate}T${data.startTime}:00`).toISOString(),
            };

            // Constrói a data/hora de término
            const timePart = data.endTime ? `${data.endTime}:00` : '00:00:00';
            try {
                // Esta linha agora é segura porque data.endDate não será "" (garantido pelo Zod)
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

    // --- Lógica para o Combobox de Tipo ---
    const handleTypeSelect = (value: string) => {
        form.setValue("type", value, { shouldValidate: true }); // Define o valor no formulário
        setTypeSearchValue(""); // Limpa a busca após selecionar/criar
        setIsTypePopoverOpen(false); // Fecha o Popover
    };

    // Filtra tipos existentes baseado na busca atual
    const filteredTypes = activityTypes.filter(type =>
        type.toLowerCase().includes(typeSearchValue.toLowerCase())
    );

    // Verifica se o valor buscado é válido para criação e não existe exatamente igual (ignorando case)
    const canCreateNewType = typeSearchValue.trim().length > 0 &&
        !activityTypes.some(t => t.toLowerCase() === typeSearchValue.trim().toLowerCase());

    // --- Renderização ---
    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <PlusCircle className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Nova Atividade</h1>
                        <p className="text-muted-foreground mt-1 leading-relaxed">
                            Crie uma nova atividade para sua equipe
                        </p>
                    </div>
                </div>
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

                    {/* Tipo (Combobox com Criação) */}
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Tipo</FormLabel>
                                <Popover open={isTypePopoverOpen} onOpenChange={setIsTypePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={isTypePopoverOpen}
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                disabled={isLoadingTypes} // Desabilita enquanto carrega tipos
                                            >
                                                {isLoadingTypes
                                                    ? "Carregando tipos..."
                                                    : (field.value
                                                        ? field.value // Mostra o tipo selecionado/digitado
                                                        : "Selecione ou crie um tipo")}
                                                {isLoadingTypes ? (
                                                    <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin"/>
                                                ) : (
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                )}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command
                                            // Descomente se quiser uma filtragem mais rigorosa no Command
                                            // filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}
                                        >
                                            <CommandInput
                                                placeholder="Buscar ou digitar novo tipo..."
                                                value={typeSearchValue}
                                                onValueChange={setTypeSearchValue} // Atualiza o estado de busca
                                            />
                                            <CommandList>
                                                <CommandEmpty>
                                                    {canCreateNewType
                                                        ? "Nenhum tipo encontrado. Clique abaixo para criar." // Mensagem se pode criar
                                                        : "Nenhum tipo encontrado."}
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {/* Opção de Criar Novo Tipo */}
                                                    {canCreateNewType && (
                                                        <CommandItem
                                                            // Usar o próprio texto como valor aqui funciona bem
                                                            value={typeSearchValue.trim()}
                                                            onSelect={() => handleTypeSelect(typeSearchValue.trim())}
                                                            className="cursor-pointer"
                                                        >
                                                            <PlusCircle className="mr-2 h-4 w-4 text-green-600" />
                                                            Criar novo tipo: "{typeSearchValue.trim()}"
                                                        </CommandItem>
                                                    )}
                                                    {/* Lista de Tipos Existentes Filtrados */}
                                                    {filteredTypes.map((type) => (
                                                        <CommandItem
                                                            key={type}
                                                            value={type}
                                                            onSelect={() => handleTypeSelect(type)}
                                                            className="cursor-pointer"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    // Compara o valor do campo com o tipo atual
                                                                    field.value === type ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {type}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Selecione um tipo existente ou digite para criar um novo.
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
                                        className="resize-none h-60"
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

                    {/* Cliente (Combobox - com estado de loading) */}
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
                                                disabled={isLoadingClients} // Desabilita enquanto carrega clientes
                                            >
                                                {isLoadingClients
                                                    ? "Carregando clientes..."
                                                    : (field.value
                                                        ? (() => {
                                                            const client = clients.find(c => c.id === field.value);
                                                            if (!client) return "Selecione um cliente";
                                                            // Adiciona verificação defensiva para companyName
                                                            const companyName = (client as any).companyName;
                                                            return client.type === 'juridica' && companyName ? companyName : client.name;
                                                        })()
                                                        : "Selecione um cliente")}
                                                {isLoadingClients ? (
                                                    <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin"/>
                                                ) : (
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                )}
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
                                                                // Usar um valor único e consistente para busca/filtragem
                                                                value={`${displayValue} ${client.id}`}
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
                                    tabIndex={-1} // Melhora a navegação por teclado, opcional
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
                                                        format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR }) // Adicionado T12:00 para evitar problemas de timezone na formatação
                                                    ) : (
                                                        <span>Selecione a data</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                // Adicionado T12:00 para consistência ao selecionar
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
                                            className="w-32" // Largura fixa para consistência
                                            {...field}
                                            value={field.value || ""} // Garante que value nunca seja null/undefined
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
                                                        format(new Date(`${field.value}T12:00:00`), "PPP", { locale: ptBR }) // Adicionado T12:00
                                                    ) : (
                                                        <span>Selecione a data</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                // Adicionado T12:00
                                                selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : '')} // Passa '' se desmarcado
                                                disabled={(date) => {
                                                    const startDateValue = form.getValues("startDate");
                                                    // Compara apenas a data, ignorando a hora
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
                                            className="w-32" // Largura fixa para consistência
                                            {...field}
                                            value={field.value || ""} // Garante que value nunca seja null/undefined
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
                        {/* Botão desabilitado se carregando dados OU submetendo */}
                        <Button type="submit" disabled={isLoadingClients || isLoadingTypes || isSubmitting}>
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