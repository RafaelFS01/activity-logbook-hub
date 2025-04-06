
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, ArrowLeft, Mail, Phone, User, Calendar, CheckCircle, XCircle, RotateCcw, Search, Filter } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { getCollaboratorById, updateCollaboratorStatus, CollaboratorStatus, CollaboratorData } from '@/services/firebase/collaborators';
import { UserData } from '@/services/firebase/auth';
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivitiesByAssignee, Activity, ActivityStatus } from '@/services/firebase/activities';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Combobox } from "@/components/ui/combobox";

const CollaboratorDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [collaborator, setCollaborator] = useState<CollaboratorData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();
    
    // Estados para atividades e filtros
    const [activities, setActivities] = useState<Activity[]>([]);
    const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilters, setStatusFilters] = useState<ActivityStatus[]>([]);
    const [activityTypes, setActivityTypes] = useState<string[]>([]);
    const [selectedType, setSelectedType] = useState<string | null>(null);

    useEffect(() => {
        const fetchCollaborator = async () => {
            if (!id) {
                toast({
                    title: "Erro",
                    description: "ID do colaborador não fornecido.",
                    variant: "destructive",
                });
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const fetchedCollaborator = await getCollaboratorById(id);
                if (fetchedCollaborator) {
                    setCollaborator(fetchedCollaborator as CollaboratorData);
                    
                    // Buscar atividades associadas a este colaborador
                    const collaboratorActivities = await getActivitiesByAssignee(id);
                    setActivities(collaboratorActivities);
                    setFilteredActivities(collaboratorActivities);
                    
                    // Extrair tipos únicos de atividades
                    const types = Array.from(new Set(collaboratorActivities.map(activity => activity.type).filter(Boolean))) as string[];
                    setActivityTypes(types);
                } else {
                    toast({
                        title: "Colaborador não encontrado",
                        description: "Não foi possível encontrar o colaborador com o ID fornecido.",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error("Erro ao buscar colaborador:", error);
                toast({
                    title: "Erro ao buscar colaborador",
                    description: "Ocorreu um erro ao buscar os detalhes do colaborador.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchCollaborator();
    }, [id, toast]);
    
    // Efeito para filtrar atividades
    useEffect(() => {
        let filtered = [...activities];
        
        if (searchTerm) {
            filtered = filtered.filter(activity => 
                activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                activity.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (statusFilters.length > 0) {
            filtered = filtered.filter(activity => statusFilters.includes(activity.status));
        }
        
        if (selectedType) {
            filtered = filtered.filter(activity => activity.type === selectedType);
        }
        
        setFilteredActivities(filtered);
    }, [activities, searchTerm, statusFilters, selectedType]);

    const handleStatusChange = async (newStatus: CollaboratorStatus) => {
        if (!id) {
            toast({
                title: "Erro",
                description: "ID do colaborador não fornecido.",
                variant: "destructive",
            });
            return;
        }

        if (!user?.uid) {
            toast({
                title: "Erro",
                description: "Usuário não autenticado.",
                variant: "destructive",
            });
            return;
        }

        try {
            await updateCollaboratorStatus(id, newStatus, user.uid);
            setCollaborator(prev => prev ? { ...prev, status: newStatus } : null);
            toast({
                title: "Status atualizado",
                description: `O status do colaborador foi alterado para ${newStatus}.`,
            });
        } catch (error) {
            console.error("Erro ao atualizar status do colaborador:", error);
            toast({
                title: "Erro ao atualizar status",
                description: "Não foi possível atualizar o status do colaborador.",
                variant: "destructive",
            });
        }
    };

    const getStatusBadge = (status: CollaboratorStatus) => {
        switch (status) {
            case "active":
                return <Badge variant="outline"><CheckCircle className="h-3 w-3 mr-1" /> Ativo</Badge>;
            case "inactive":
                return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Inativo</Badge>;
            case "pending":
                return <Badge variant="default"><RotateCcw className="h-3 w-3 mr-1" /> Pendente</Badge>;
            default:
                return <Badge variant="secondary">Desconhecido</Badge>;
        }
    };
    
    // Função para alternar filtros de status
    const toggleStatusFilter = (status: ActivityStatus) => {
        setStatusFilters(prev => {
            if (prev.includes(status)) {
                return prev.filter(s => s !== status);
            } else {
                return [...prev, status];
            }
        });
    };
    
    // Função para resetar filtros
    const resetFilters = () => {
        setSearchTerm("");
        setStatusFilters([]);
        setSelectedType(null);
    };
    
    // Converter tipos para formato de opções do Combobox
    const typeOptions = activityTypes.map(type => ({
        value: type,
        label: type
    }));

    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
            <div className="mb-4">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>

            {isLoading ? (
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle><Skeleton className="h-5 w-40" /></CardTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled>
                                    <User className="mr-2 h-4 w-4" />
                                    Editar <span className="ml-auto">⌘E</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Desativar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-1">
                                <h2 className="text-2xl font-semibold"><Skeleton className="h-5 w-40" /></h2>
                                <p className="text-sm text-muted-foreground"><Skeleton className="h-4 w-32" /></p>
                            </div>
                        </div>
                        <div className="grid gap-4 mt-4">
                            <div className="text-sm font-medium">
                                <User className="mr-2 inline-block h-4 w-4" /> <Skeleton className="h-4 w-48 inline-block" />
                            </div>
                            <div className="text-sm font-medium">
                                <Mail className="mr-2 inline-block h-4 w-4" /> <Skeleton className="h-4 w-48 inline-block" />
                            </div>
                            <div className="text-sm font-medium">
                                <Phone className="mr-2 inline-block h-4 w-4" /> <Skeleton className="h-4 w-48 inline-block" />
                            </div>
                            <div className="text-sm font-medium">
                                <Calendar className="mr-2 inline-block h-4 w-4" /> <Skeleton className="h-4 w-48 inline-block" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : collaborator ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle>Detalhes do Colaborador</CardTitle>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Abrir menu</span>
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => navigate(`/collaborators/edit/${id}`)}>
                                            <User className="mr-2 h-4 w-4" />
                                            Editar <span className="ml-auto">⌘E</span>
                                        </DropdownMenuItem>
                                        {collaborator.status === 'active' ? (
                                            <DropdownMenuItem onClick={() => handleStatusChange('inactive')}>
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Desativar
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Ativar
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-4">
                                    <Avatar>
                                        <AvatarImage src={collaborator.photoURL} />
                                        <AvatarFallback>{collaborator.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-semibold">{collaborator.name}</h2>
                                        <p className="text-sm text-muted-foreground">{collaborator.role}</p>
                                        {getStatusBadge(collaborator.status)}
                                    </div>
                                </div>
                                <div className="grid gap-4 mt-4">
                                    <div className="text-sm font-medium">
                                        <User className="mr-2 inline-block h-4 w-4" /> {collaborator.name}
                                    </div>
                                    <div className="text-sm font-medium">
                                        <Mail className="mr-2 inline-block h-4 w-4" /> {collaborator.email}
                                    </div>
                                    <div className="text-sm font-medium">
                                        <Phone className="mr-2 inline-block h-4 w-4" /> {collaborator.phone || 'Não informado'}
                                    </div>
                                    <div className="text-sm font-medium">
                                        <Calendar className="mr-2 inline-block h-4 w-4" /> Criado em: {collaborator.createdAt || 'Data não disponível'}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    variant="outline" 
                                    className="w-full" 
                                    onClick={() => navigate(`/collaborators/edit/${id}`)}
                                >
                                    Editar Colaborador
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                    
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Atividades do Colaborador</CardTitle>
                                <CardDescription>
                                    Atividades atribuídas a este colaborador
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex flex-col space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Buscar atividades..."
                                                className="pl-8"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        
                                        {/* Filtro de tipo de atividade */}
                                        {typeOptions.length > 0 && (
                                            <div className="mb-4">
                                                <Label className="mb-2 block">Tipo de Atividade</Label>
                                                <Combobox
                                                    options={typeOptions}
                                                    selectedValue={selectedType}
                                                    onSelect={(value) => setSelectedType(value)}
                                                    placeholder="Filtrar por tipo..."
                                                    allowClear={true}
                                                />
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    id="status-pending" 
                                                    checked={statusFilters.includes("pending")} 
                                                    onCheckedChange={() => toggleStatusFilter("pending")}
                                                />
                                                <Label htmlFor="status-pending" className="flex items-center cursor-pointer text-sm">
                                                    <RotateCcw className="h-3 w-3 mr-1 text-yellow-600" /> Pendentes
                                                </Label>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    id="status-in-progress" 
                                                    checked={statusFilters.includes("in-progress")} 
                                                    onCheckedChange={() => toggleStatusFilter("in-progress")}
                                                />
                                                <Label htmlFor="status-in-progress" className="flex items-center cursor-pointer text-sm">
                                                    <RotateCcw className="h-3 w-3 mr-1 text-blue-600" /> Em Progresso
                                                </Label>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    id="status-completed" 
                                                    checked={statusFilters.includes("completed")} 
                                                    onCheckedChange={() => toggleStatusFilter("completed")}
                                                />
                                                <Label htmlFor="status-completed" className="flex items-center cursor-pointer text-sm">
                                                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" /> Concluídas
                                                </Label>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    id="status-cancelled" 
                                                    checked={statusFilters.includes("cancelled")} 
                                                    onCheckedChange={() => toggleStatusFilter("cancelled")}
                                                />
                                                <Label htmlFor="status-cancelled" className="flex items-center cursor-pointer text-sm">
                                                    <XCircle className="h-3 w-3 mr-1 text-red-600" /> Canceladas
                                                </Label>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-end">
                                            <Button variant="outline" size="sm" onClick={resetFilters}>
                                                Limpar Filtros
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {filteredActivities.length > 0 ? (
                                        <div className="space-y-4">
                                            {filteredActivities.map((activity) => (
                                                <Card key={activity.id} className="overflow-hidden">
                                                    <CardHeader className="p-4">
                                                        <div className="flex justify-between items-start">
                                                            <CardTitle className="text-base">{activity.title}</CardTitle>
                                                            <Badge
                                                                className={
                                                                    activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                    activity.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                                                    activity.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                                }
                                                            >
                                                                {activity.status === 'completed' ? 'Concluída' :
                                                                activity.status === 'in-progress' ? 'Em andamento' :
                                                                activity.status === 'cancelled' ? 'Cancelada' :
                                                                'Pendente'}
                                                            </Badge>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                                            {activity.description}
                                                        </p>
                                                        {activity.type && (
                                                            <div className="text-xs font-medium mb-2">
                                                                <Badge variant="outline" className="mr-2">
                                                                    {activity.type}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center text-xs text-muted-foreground">
                                                            <Calendar className="h-3 w-3 mr-1" />
                                                            <span>
                                                                {formatDistanceToNow(new Date(activity.updatedAt), {
                                                                    addSuffix: true,
                                                                    locale: ptBR
                                                                })}
                                                            </span>
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="p-2 bg-muted/50">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="ml-auto"
                                                            onClick={() => navigate(`/activities/${activity.id}`)}
                                                        >
                                                            Ver detalhes
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center p-6">
                                            <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
                                            <p className="text-muted-foreground mb-4">
                                                {searchTerm || statusFilters.length > 0 || selectedType ? 
                                                    "Não foram encontradas atividades com os filtros aplicados." : 
                                                    "Este colaborador ainda não possui atividades atribuídas."}
                                            </p>
                                            {searchTerm || statusFilters.length > 0 || selectedType ? (
                                                <Button onClick={resetFilters}>Limpar Filtros</Button>
                                            ) : (
                                                <Button onClick={() => navigate("/activities/new")}>
                                                    Nova Atividade
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="text-center">
                    <h2 className="text-lg font-semibold">Colaborador não encontrado</h2>
                    <p className="text-muted-foreground">Não foi possível carregar os detalhes deste colaborador.</p>
                </div>
            )}
        </div>
    );
};

export default CollaboratorDetailsPage;
