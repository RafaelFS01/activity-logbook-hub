
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getCollaboratorById, updateCollaborator, deleteCollaborator } from '@/services/firebase/collaborators';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { CalendarDays, Mail, Phone, MapPin, UserCog, Award, Shield, AlertTriangle } from 'lucide-react';

const CollaboratorDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: collaborator, isLoading, isError, error } = useQuery({
    queryKey: ['collaborator', id],
    queryFn: () => getCollaboratorById(id || ''),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCollaborator(id || ''),
    onSuccess: () => {
      toast.success('Colaborador removido com sucesso');
      navigate('/collaborators');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover colaborador: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao carregar dados</CardTitle>
            <CardDescription>Não foi possível carregar os dados do colaborador.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{(error as Error)?.message || 'Erro desconhecido'}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/collaborators')}>Voltar para lista</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!collaborator) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Colaborador não encontrado</CardTitle>
            <CardDescription>O colaborador solicitado não existe ou foi removido.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/collaborators')}>Voltar para lista</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      user: 'Usuário',
    };
    return roles[role] || role;
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    if (status === 'inactive') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  };

  const getRoleColor = (role: string) => {
    if (role === 'admin') return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
    if (role === 'manager') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-900">
          <div className="flex justify-between items-center mb-2">
            <CardTitle>{collaborator.name}</CardTitle>
            <div className="flex gap-2">
              <Badge className={getRoleColor(collaborator.role)}>{getRoleLabel(collaborator.role)}</Badge>
              <Badge className={getStatusColor(collaborator.status)}>
                {collaborator.status === 'active' && 'Ativo'}
                {collaborator.status === 'inactive' && 'Inativo'}
                {collaborator.status === 'pending' && 'Pendente'}
              </Badge>
            </div>
          </div>
          <CardDescription>Detalhes do colaborador</CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Informações Básicas</h3>
              
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <span className="text-sm">Email: {collaborator.email}</span>
              </div>
              
              {collaborator.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Telefone: {collaborator.phone}</span>
                </div>
              )}
              
              {collaborator.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Endereço: {collaborator.address}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Detalhes Adicionais</h3>
              
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-slate-500" />
                <span className="text-sm">Cargo: {collaborator.position || 'Não especificado'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-slate-500" />
                <span className="text-sm">Especialidade: {collaborator.specialty || 'Não especificada'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <span className="text-sm">Cadastrado em: {formatDate(collaborator.createdAt)}</span>
              </div>
            </div>
          </div>
          
          {collaborator.notes && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Observações</h3>
              <p className="text-sm">{collaborator.notes}</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-4 bg-slate-50 dark:bg-slate-900">
          <Button variant="outline" onClick={() => navigate('/collaborators')}>
            Voltar
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/collaborators/edit/${id}`)}
            >
              Editar
            </Button>
            
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Excluir</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirmar exclusão
                  </DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDeleteDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete} 
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CollaboratorDetailsPage;
