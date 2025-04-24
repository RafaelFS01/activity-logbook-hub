import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    MoreVertical, ArrowLeft, Mail, Phone, User, CheckCircle, XCircle, RotateCcw, Search, Filter, PlusCircle, List,
    Calendar as CalendarIcon // Renomeado para evitar conflito
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getCollaboratorById, updateCollaboratorStatus, CollaboratorStatus, CollaboratorData } from '@/services/firebase/collaborators';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
// Importa diretamente Activity e ActivityStatus
import { getActivitiesByAssignee, Activity, ActivityStatus } from '@/services/firebase/activities';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow, format } from "date-fns"; // Adicionado format
import { ptBR } from "date-fns/locale";
import { Combobox } from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Adicionado
import { Calendar } from "@/components/ui/calendar"; // Adicionado
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Adicionado
import { cn } from "@/lib/utils"; // Adicionado

// Constante para itens por página de atividades
const ACTIVITIES_PER_PAGE = 10;

// REMOVIDA A INTERFACE ActivityWithDates - Usaremos a interface Activity importada

const CollaboratorDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [collaborator, setCollaborator] = useState<CollaboratorData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();

    // Usa Activity diretamente
    const [activities, setActivities] = useState<Activity[]>([]);
    const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilters, setStatusFilters] = useState<ActivityStatus[]>([]);
    const [activityTypes, setActivityTypes] = useState<string[]>([]);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [currentActivityPage, setCurrentActivityPage] = useState(1);

    // Estados para filtro de período
    // !! IMPORTANTE: Verifique se 'endDate' é o nome correto na sua interface Activity. Se for 'dueDate', ajuste aqui e no RadioGroup abaixo.
    const [dateType, setDateType] = useState<"startDate" | "endDate">("startDate");
    const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined);
    const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined);

    useEffect(() => {
        const fetchCollaboratorAndActivities = async () => {
            if (!id) {
                toast({ title: "Erro", description: "ID do colaborador não fornecido.", variant: "destructive" });
                setIsLoading(false);
                navigate(-1);
                return;
            }

            setIsLoading(true);
            try {
                const fetchedCollaborator = await getCollaboratorById(id);
                if (fetchedCollaborator) {
                    setCollaborator(fetchedCollaborator as CollaboratorData);

                    const collaboratorActivities = await getActivitiesByAssignee(id);
                    // Usa Activity diretamente
                    setActivities(collaboratorActivities as Activity[]);

                    // Extrai tipos únicos das atividades carregadas
                    const types = Array.from(new Set(collaboratorActivities.map(activity => activity.type).filter(Boolean))) as string[];
                    setActivityTypes(types);

                } else {
                    toast({ title: "Colaborador não encontrado", description: "Não foi possível encontrar o colaborador com o ID fornecido.", variant: "destructive" });
                    navigate('/collaborators');
                }
            } catch (error) {
                console.error("Erro ao buscar colaborador ou atividades:", error);
                toast({ title: "Erro ao buscar dados", description: "Ocorreu um erro ao buscar os detalhes.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchCollaboratorAndActivities();
    }, [id, toast, navigate]);

    // useEffect de filtro ATUALIZADO para usar Activity
    useEffect(() => {
        let filtered = [...activities];

        // Filtro por Termo de Busca
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(activity =>
                activity.title.toLowerCase().includes(lowerSearchTerm) ||
                // !! IMPORTANTE: Verifique se 'description' existe e se é opcional (?) na sua interface Activity
                activity.description?.toLowerCase().includes(lowerSearchTerm)
            );
        }

        // Filtro por Status
        if (statusFilters.length > 0) {
            filtered = filtered.filter(activity => statusFilters.includes(activity.status));
        }

        // Filtro por Tipo
        if (selectedType) {
            filtered = filtered.filter(activity => activity.type === selectedType);
        }

        // Lógica de filtro de período
        if (startPeriod || endPeriod) {
            filtered = filtered.filter(activity => {
                // !! IMPORTANTE: Verifique se os campos 'startDate' e 'endDate' (ou 'dueDate') existem na sua interface Activity
                // Se o campo for 'dueDate', substitua activity.endDate por activity.dueDate abaixo.
                const dateField = dateType === "startDate" ? activity.startDate : activity.endDate;

                if (!dateField) return false; // Atividade não tem a data necessária para o filtro

                try {
                    // Tenta converter o campo para Data (aceita string ISO, objeto Date, Timestamp do Firebase)
                    const activityDate = new Date(dateField as string | Date);
                    if (isNaN(activityDate.getTime())) {
                        // console.warn(`Data inválida encontrada para atividade ${activity.id}:`, dateField);
                        return false; // Pula atividades com data inválida no campo selecionado
                    }

                    // Compara com os períodos, ajustando para início/fim do dia para incluir a data selecionada
                    const checkStart = startPeriod ? activityDate.getTime() >= startPeriod.setHours(0, 0, 0, 0) : true;
                    const checkEnd = endPeriod ? activityDate.getTime() <= endPeriod.setHours(23, 59, 59, 999) : true;

                    return checkStart && checkEnd;

                } catch (e) {
                    // console.error("Erro ao processar data durante filtro:", dateField, e);
                    return false; // Pula se houver erro ao processar a data
                }
            });
        }

        // Ordenação (por data de atualização, mais recentes primeiro)
        filtered.sort((a, b) => {
            // !! IMPORTANTE: Verifique se 'updatedAt' existe na sua interface Activity
            const dateA = a.updatedAt ? new Date(a.updatedAt as string | Date).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt as string | Date).getTime() : 0;
            // Trata casos onde as datas podem ser inválidas
            if (isNaN(dateA) && isNaN(dateB)) return 0; // Se ambas inválidas, mantém a ordem
            if (isNaN(dateA)) return 1; // Coloca 'a' (inválida) depois
            if (isNaN(dateB)) return -1; // Coloca 'b' (inválida) depois
            return dateB - dateA; // Ordena decrescente (mais recente primeiro)
        });

        setFilteredActivities(filtered);
        setCurrentActivityPage(1); // Resetar para página 1 ao aplicar filtros

        // Dependências do useEffect de filtro
    }, [activities, searchTerm, statusFilters, selectedType, dateType, startPeriod, endPeriod]);


    const paginatedActivities = useMemo(() => {
        const startIndex = (currentActivityPage - 1) * ACTIVITIES_PER_PAGE;
        const endIndex = startIndex + ACTIVITIES_PER_PAGE;
        return filteredActivities.slice(startIndex, endIndex);
    }, [filteredActivities, currentActivityPage]);

    const totalActivityPages = useMemo(() => {
        if (filteredActivities.length === 0) return 0;
        return Math.ceil(filteredActivities.length / ACTIVITIES_PER_PAGE);
    }, [filteredActivities]);

    const handleStatusChange = async (newStatus: CollaboratorStatus) => {
        if (!id || !collaborator) return;
        if (!user?.uid) {
            toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
            return;
        }
        const originalStatus = collaborator.status;
        // Otimisticamente atualiza a UI
        setCollaborator(prev => prev ? { ...prev, status: newStatus } : null);
        try {
            await updateCollaboratorStatus(id, newStatus, user.uid);
            toast({ title: "Status atualizado", description: `Status alterado para ${newStatus}.` });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            // Reverte a UI em caso de erro
            setCollaborator(prev => prev ? { ...prev, status: originalStatus } : null);
            toast({ title: "Erro ao atualizar status", description: "Não foi possível alterar o status.", variant: "destructive" });
        }
    };

    const getStatusBadge = (status: CollaboratorStatus | undefined) => {
        switch (status) {
            case "active": return <Badge variant="outline" className="border-green-500 text-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Ativo</Badge>;
            case "inactive": return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Inativo</Badge>;
            case "pending": return <Badge variant="default" className="bg-yellow-100 text-yellow-800"><RotateCcw className="h-3 w-3 mr-1" /> Pendente</Badge>;
            default: return <Badge variant="outline">Indefinido</Badge>;
        }
    };

    // Formata data para dd/MM/yyyy ou retorna 'N/D' ou mensagem de erro
    const formatDate = (dateInput: string | Date | undefined | null): string => {
        if (!dateInput) return 'N/D';
        try {
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) {
                return 'Data inválida';
            }
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            console.error("Erro ao formatar data:", dateInput, error);
            return 'Erro data';
        }
    };

    const toggleStatusFilter = (status: ActivityStatus) => {
        setStatusFilters(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    // Limpa todos os filtros aplicados
    const resetFilters = () => {
        setSearchTerm("");
        setStatusFilters([]);
        setSelectedType(null);
        // Limpa os filtros de data
        setDateType("startDate"); // Volta para o padrão
        setStartPeriod(undefined);
        setEndPeriod(undefined);
    };

    const typeOptions = useMemo(() => activityTypes.map(type => ({
        value: type,
        label: type || "Sem tipo" // Mostra "Sem tipo" se o tipo for vazio/nulo
    })), [activityTypes]);


    // --- Renderização ---
    if (isLoading) {
        return (
            <div className="container mx-auto py-6 px-4 md:px-6">
                <div className="mb-4">
                    <Button variant="ghost" disabled>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Skeleton Colaborador */}
                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-8 w-8" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-5 w-1/4" />
                                    </div>
                                </div>
                                <div className="grid gap-3 mt-6">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Skeleton className="h-10 w-full" />
                            </CardFooter>
                        </Card>
                    </div>
                    {/* Skeleton Atividades */}
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-1/2 mb-2" />
                                <Skeleton className="h-4 w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Skeletons para filtros */}
                                    <Skeleton className="h-10 w-full" />
                                    <div className="flex gap-4">
                                        <Skeleton className="h-6 w-24" />
                                        <Skeleton className="h-6 w-24" />
                                        <Skeleton className="h-6 w-24" />
                                    </div>
                                    {/* Skeletons para lista */}
                                    <Skeleton className="h-24 w-full rounded-lg" />
                                    <Skeleton className="h-24 w-full rounded-lg" />
                                    <Skeleton className="h-24 w-full rounded-lg" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    if (!collaborator) {
        return (
            <div className="container mx-auto py-6 px-4 md:px-6 text-center">
                <div className="mb-4 text-left">
                    <Button variant="ghost" onClick={() => navigate('/collaborators')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Lista
                    </Button>
                </div>
                <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>Erro</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Colaborador não encontrado ou ocorreu um erro ao carregar seus dados.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Flag para verificar se algum filtro está ativo
    const hasActiveFilters = searchTerm || statusFilters.length > 0 || selectedType || startPeriod || endPeriod;

    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
            {/* Botão Voltar */}
            <div className="mb-4">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coluna Detalhes Colaborador */}
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            {/* Título e Subtítulo */}
                            <div className="flex-1 mr-2 overflow-hidden">
                                <CardTitle className="text-xl truncate" title={collaborator.name}>
                                    {collaborator.name || 'Nome não definido'}
                                </CardTitle>
                                <CardDescription className="truncate" title={collaborator.role}>
                                    {collaborator.role || 'Cargo não definido'}
                                </CardDescription>
                            </div>
                            {/* Menu Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                        <span className="sr-only">Abrir menu</span>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {/* Ação Editar (Admin ou Próprio Usuário) */}
                                    {(user?.role === 'admin' || user?.uid === collaborator.uid) && (
                                        <DropdownMenuItem onClick={() => navigate(`/collaborators/edit/${id}`)}>
                                            <User className="mr-2 h-4 w-4" /> Editar
                                        </DropdownMenuItem>
                                    )}
                                    {/* Ações de Status (Somente Admin e não sobre si mesmo) */}
                                    {user?.role === 'admin' && user.uid !== collaborator.uid && (
                                        <>
                                            {collaborator.status === 'active' ? (
                                                <DropdownMenuItem onClick={() => handleStatusChange('inactive')} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                                    <XCircle className="mr-2 h-4 w-4" /> Desativar
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem onClick={() => handleStatusChange('active')} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                                                    <CheckCircle className="mr-2 h-4 w-4" /> Ativar
                                                </DropdownMenuItem>
                                            )}
                                            {collaborator.status !== 'pending' && (
                                                <DropdownMenuItem onClick={() => handleStatusChange('pending')} className="text-yellow-600 focus:text-yellow-700 focus:bg-yellow-50">
                                                    <RotateCcw className="mr-2 h-4 w-4" /> Marcar Pendente
                                                </DropdownMenuItem>
                                            )}
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 mb-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={collaborator.photoURL} alt={collaborator.name} />
                                    <AvatarFallback>{collaborator.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    {getStatusBadge(collaborator.status)}
                                </div>
                            </div>
                            <div className="grid gap-2 text-sm">
                                <div className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /><span className="truncate" title={collaborator.email}>{collaborator.email || 'N/D'}</span></div>
                                <div className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" /><span>{collaborator.phone || 'N/D'}</span></div>
                                <div className="flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground" /><span>CPF: {collaborator.cpf || 'N/D'}</span></div>
                                {/* !! IMPORTANTE: Verifique se 'admissionDate', 'createdAt', 'updatedAt' existem em CollaboratorData */}
                                {collaborator.admissionDate && (<div className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" /><span>Admissão: {formatDate(collaborator.admissionDate)}</span></div>)}
                                {collaborator.createdAt && (<div className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" /><span>Cadastro: {formatDate(collaborator.createdAt)}</span></div>)}
                                {collaborator.updatedAt && (<div className="flex items-center"><RotateCcw className="mr-2 h-4 w-4 text-muted-foreground" /><span>Últ. Att: {new Date(collaborator.updatedAt as string | Date).toLocaleString('pt-BR')}</span></div>)}
                            </div>
                        </CardContent>
                        {/* Botão Editar no Footer (Admin ou Próprio Usuário) */}
                        {(user?.role === 'admin' || user?.uid === collaborator.uid) && (
                            <CardFooter>
                                <Button variant="outline" className="w-full" onClick={() => navigate(`/collaborators/edit/${id}`)}>
                                    <User className="mr-2 h-4 w-4" /> Editar Colaborador
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>

                {/* Coluna Atividades */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Atividades do Colaborador</CardTitle>
                            <CardDescription>
                                {filteredActivities.length > 0
                                    ? `Exibindo ${paginatedActivities.length} de ${filteredActivities.length} atividades.`
                                    : (hasActiveFilters ? "Nenhuma atividade encontrada com os filtros aplicados." : "Nenhuma atividade encontrada.")
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6"> {/* Espaço entre filtros e lista */}
                                {/* --- ÁREA DE FILTROS --- */}
                                <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                                    {/* Linha 1: Busca, Tipo, Limpar */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                                        {/* Busca */}
                                        <div className="lg:col-span-1">
                                            <Label htmlFor="activity-search">Buscar</Label>
                                            <div className="relative mt-1">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input id="activity-search" type="search" placeholder="Título ou descrição..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                            </div>
                                        </div>

                                        {/* Combobox Tipo */}
                                        {typeOptions.length > 0 && (
                                            <div className="lg:col-span-1">
                                                <Label htmlFor="activity-type-filter">Tipo</Label>
                                                <Combobox
                                                    id="activity-type-filter"
                                                    options={typeOptions}
                                                    selectedValue={selectedType}
                                                    onSelect={(value) => setSelectedType(value)}
                                                    placeholder="Filtrar por tipo..."
                                                    allowClear={true}
                                                    searchPlaceholder='Buscar tipo...'
                                                    noResultsText='Nenhum tipo encontrado.'
                                                    className="mt-1" // Adiciona margem superior para alinhar com Input
                                                />
                                            </div>
                                        )}

                                        {/* Botão Limpar Filtros */}
                                        <div className="lg:col-span-1 flex justify-end">
                                            <Button variant="ghost" size="sm" onClick={resetFilters} title="Remover todos os filtros">
                                                <Filter className="mr-1 h-3 w-3" /> Limpar Tudo
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Linha 2: Checkboxes Status */}
                                    <div className="pt-4 border-t">
                                        <Label className="font-semibold text-sm mb-2 block">Status:</Label>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                            {[
                                                { status: 'pending' as ActivityStatus, label: 'Pendentes', icon: RotateCcw, color: 'text-yellow-600' },
                                                { status: 'in-progress' as ActivityStatus, label: 'Em Progresso', icon: RotateCcw, color: 'text-blue-600' },
                                                { status: 'completed' as ActivityStatus, label: 'Concluídas', icon: CheckCircle, color: 'text-green-600' },
                                                { status: 'cancelled' as ActivityStatus, label: 'Canceladas', icon: XCircle, color: 'text-red-600' }
                                            ].map(({ status, label, icon: Icon, color }) => (
                                                <div key={status} className="flex items-center gap-2">
                                                    <Checkbox id={`status-${status}`} checked={statusFilters.includes(status)} onCheckedChange={() => toggleStatusFilter(status)} />
                                                    <Label htmlFor={`status-${status}`} className={`flex items-center cursor-pointer text-sm font-medium ${color}`}><Icon className={`h-3.5 w-3.5 mr-1 ${color}`} /> {label}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Linha 3: Filtro de Período */}
                                    <div className="pt-4 border-t">
                                        <Label className="font-semibold text-sm mb-2 block">Filtrar por Data:</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                            {/* Seleção do Tipo de Data */}
                                            <div className="md:col-span-1">
                                                <RadioGroup
                                                    value={dateType}
                                                    // !! IMPORTANTE: Se o campo for 'dueDate', ajuste o tipo do estado dateType para aceitar 'dueDate'
                                                    onValueChange={(value) => setDateType(value as "startDate" | "endDate")}
                                                    className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-1"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="startDate" id="start-date" />
                                                        <Label htmlFor="start-date" className="text-sm font-normal cursor-pointer">Início</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        {/* !! IMPORTANTE: Se o campo for 'dueDate', mude o value aqui para "dueDate" */}
                                                        <RadioGroupItem value="endDate" id="end-date" />
                                                        <Label htmlFor="end-date" className="text-sm font-normal cursor-pointer">Término</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>

                                            {/* Data de Início do Período */}
                                            <div className="md:col-span-1">
                                                <Label htmlFor="start-period-btn" className="text-xs text-muted-foreground">Início Período</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            id="start-period-btn"
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal mt-1",
                                                                !startPeriod && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {startPeriod ? format(startPeriod, "dd/MM/yyyy") : <span>Data inicial</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={startPeriod}
                                                            onSelect={setStartPeriod}
                                                            initialFocus
                                                            locale={ptBR} // Adiciona locale ptBR ao calendário
                                                            disabled={(date) => endPeriod ? date > endPeriod : false} // Impede selecionar data inicial após a final
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            {/* Data de Fim do Período */}
                                            <div className="md:col-span-1">
                                                <Label htmlFor="end-period-btn" className="text-xs text-muted-foreground">Fim Período</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            id="end-period-btn"
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal mt-1",
                                                                !endPeriod && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {endPeriod ? format(endPeriod, "dd/MM/yyyy") : <span>Data final</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={endPeriod}
                                                            onSelect={setEndPeriod}
                                                            initialFocus
                                                            locale={ptBR} // Adiciona locale ptBR ao calendário
                                                            disabled={(date) => startPeriod ? date < startPeriod : false} // Impede selecionar data final antes da inicial
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* --- FIM DA ÁREA DE FILTROS --- */}


                                {/* Lista de Atividades */}
                                {filteredActivities.length > 0 ? (
                                    <>
                                        <div className="space-y-4">
                                            {paginatedActivities.map((activity) => (
                                                <Card key={activity.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                                                    <CardHeader className="p-4">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <CardTitle className="text-base font-semibold flex-1 mr-2">{activity.title || "N/D"}</CardTitle>
                                                            <Badge
                                                                className={
                                                                    activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                        activity.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                                                            activity.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                                'bg-yellow-100 text-yellow-800'
                                                                }
                                                            >
                                                                {activity.status === 'completed' ? <CheckCircle className="h-3 w-3 mr-1 inline"/> :
                                                                    activity.status === 'in-progress' ? <RotateCcw className="h-3 w-3 mr-1 inline"/> :
                                                                        activity.status === 'cancelled' ? <XCircle className="h-3 w-3 mr-1 inline"/> :
                                                                            <RotateCcw className="h-3 w-3 mr-1 inline"/>
                                                                }
                                                                {activity.status === 'completed' ? 'Concluída' :
                                                                    activity.status === 'in-progress' ? 'Em andamento' :
                                                                        activity.status === 'cancelled' ? 'Cancelada' :
                                                                            'Pendente'}
                                                            </Badge>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        {/* !! IMPORTANTE: Verifique se 'description' existe na sua interface Activity */}
                                                        {activity.description && (<p className="text-sm text-muted-foreground mb-3 line-clamp-3">{activity.description}</p>)}
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                                                            {activity.type && (<Badge variant="outline">Tipo: {activity.type}</Badge>)}

                                                            {/* !! IMPORTANTE: Verifique se 'startDate' existe na sua interface Activity */}
                                                            {activity.startDate && (
                                                                <div className="flex items-center text-muted-foreground" title={`Início: ${formatDate(activity.startDate)}`}>
                                                                    <CalendarIcon className="h-3 w-3 mr-1 text-blue-500" />
                                                                    <span>Início: {formatDate(activity.startDate)}</span>
                                                                </div>
                                                            )}

                                                            {/* !! IMPORTANTE: Verifique se 'endDate' (ou 'dueDate') existe na sua interface Activity */}
                                                            {activity.endDate && (
                                                                <div className="flex items-center text-muted-foreground" title={`Término: ${formatDate(activity.endDate)}`}>
                                                                    <CalendarIcon className="h-3 w-3 mr-1 text-red-500" />
                                                                    {/* Se for 'dueDate', use formatDate(activity.dueDate) */}
                                                                    <span>Término: {formatDate(activity.endDate)}</span>
                                                                </div>
                                                            )}

                                                            {/* !! IMPORTANTE: Verifique se 'updatedAt' existe na sua interface Activity */}
                                                            {activity.updatedAt && !isNaN(new Date(activity.updatedAt as string | Date).getTime()) && (
                                                                <div className="flex items-center text-muted-foreground">
                                                                    <RotateCcw className="h-3 w-3 mr-1" />
                                                                    <span title={new Date(activity.updatedAt as string | Date).toLocaleString('pt-BR')}>
                                                                        Att. {formatDistanceToNow(new Date(activity.updatedAt as string | Date), { addSuffix: true, locale: ptBR })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="p-3 bg-muted/30 flex justify-end border-t">
                                                        <Button variant="link" size="sm" className="text-primary hover:underline h-auto py-0 px-2" onClick={() => navigate(`/activities/${activity.id}`)}>
                                                            Ver detalhes
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>

                                        {/* Paginação */}
                                        {totalActivityPages > 1 && (
                                            <div className="flex justify-center items-center space-x-2 mt-6 pt-4 border-t">
                                                <Button variant="outline" size="sm" onClick={() => setCurrentActivityPage(prev => Math.max(prev - 1, 1))} disabled={currentActivityPage === 1}>Anterior</Button>
                                                <span className="text-sm text-muted-foreground">Pág {currentActivityPage} de {totalActivityPages}</span>
                                                <Button variant="outline" size="sm" onClick={() => setCurrentActivityPage(prev => Math.min(prev + 1, totalActivityPages))} disabled={currentActivityPage === totalActivityPages}>Próxima</Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Mensagem Nenhuma Atividade */
                                    <div className="text-center p-6 border rounded-lg bg-muted/50 mt-4">
                                        <List className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                                        <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
                                        <p className="text-muted-foreground mb-4 text-sm">
                                            {hasActiveFilters
                                                ? "Não foram encontradas atividades com os filtros aplicados."
                                                : "Este colaborador não possui atividades."
                                            }
                                        </p>
                                        {hasActiveFilters ? (
                                            <Button variant="outline" onClick={resetFilters}>Limpar Filtros</Button>
                                        ) : (
                                            // Botão para criar nova atividade pré-associada ao colaborador
                                            <Button onClick={() => navigate("/activities/new", { state: { assigneeId: id, assigneeName: collaborator.name } })}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Nova Atividade
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CollaboratorDetailsPage;