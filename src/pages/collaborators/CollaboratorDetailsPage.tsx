import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, ArrowLeft, Mail, Phone, User, Calendar, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { getCollaboratorById, updateCollaboratorStatus, CollaboratorStatus } from '@/services/firebase/collaborators';
import { UserData } from '@/services/firebase/auth';
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface CollaboratorData extends UserData {
  status: CollaboratorStatus;
  photoURL?: string;
  createdAt?: string;
}

const CollaboratorDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [collaborator, setCollaborator] = useState<CollaboratorData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();

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
                <Card className="w-full max-w-md mx-auto">
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
                </Card>
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
