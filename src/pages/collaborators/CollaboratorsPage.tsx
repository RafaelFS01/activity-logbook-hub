import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserCheck, UserX, Trash2, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUserData, UserData } from "@/services/firebase/auth";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/firebase";
import { get, ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { exportCollaboratorsToExcel } from "@/utils/exportUtils";

const CollaboratorsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<(UserData & { uid: string })[]>([]);
  const [filteredCollaborators, setFilteredCollaborators] = useState<(UserData & { uid: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        setIsLoading(true);
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const collaboratorsArray = Object.entries(usersData).map(([uid, data]) => ({
            uid,
            ...(data as UserData)
          }));
          
          setCollaborators(collaboratorsArray);
          setFilteredCollaborators(collaboratorsArray);
        }
      } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollaborators();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = collaborators.filter(
        (collaborator) =>
          collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          collaborator.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCollaborators(filtered);
    } else {
      setFilteredCollaborators(collaborators);
    }
  }, [searchTerm, collaborators]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Administrador</Badge>;
      case "manager":
        return <Badge variant="default">Gerente</Badge>;
      case "collaborator":
        return <Badge variant="outline">Colaborador</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const handleDeactivateCollaborator = async (collaboratorId: string) => {
    try {
      const userRef = ref(db, `users/${collaboratorId}`);
      await update(userRef, { 
        active: false,
        updatedAt: new Date().toISOString()
      });
      
      const updatedCollaborators = collaborators.map(collab => 
        collab.uid === collaboratorId ? { ...collab, active: false } : collab
      );
      setCollaborators(updatedCollaborators);
      
      toast({
        title: "Colaborador desativado",
        description: "O colaborador foi desativado com sucesso."
      });
    } catch (error) {
      console.error("Erro ao desativar colaborador:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível desativar o colaborador."
      });
    }
  };

  const handleExport = () => {
    if (filteredCollaborators.length === 0) {
      toast({
        variant: "destructive",
        title: "Sem dados para exportar",
        description: "Não há colaboradores para exportar com os filtros atuais."
      });
      return;
    }

    try {
      exportCollaboratorsToExcel(filteredCollaborators, 'colaboradores.xlsx');
      
      toast({
        title: "Exportação concluída",
        description: `${filteredCollaborators.length} colaboradores foram exportados com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao exportar colaboradores:', error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar os colaboradores."
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Gerenciamento de Colaboradores</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar para Excel
          </Button>
          <Button onClick={() => navigate("/collaborators/new")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar colaboradores..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredCollaborators.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollaborators.map((collaborator) => (
            <Card key={collaborator.uid} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{collaborator.name}</CardTitle>
                    <CardDescription>{collaborator.email}</CardDescription>
                  </div>
                  <div>
                    {getRoleBadge(collaborator.role)}
                    {collaborator.active ? (
                      <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">
                        <UserCheck className="h-3 w-3 mr-1" /> Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 bg-red-100 text-red-800 hover:bg-red-200">
                        <UserX className="h-3 w-3 mr-1" /> Inativo
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">CPF:</span> {collaborator.cpf}</p>
                  <p><span className="font-medium">Telefone:</span> {collaborator.phone}</p>
                  <p><span className="font-medium">Data de Admissão:</span> {new Date(collaborator.admissionDate).toLocaleDateString('pt-BR')}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/collaborators/${collaborator.uid}`)}
                >
                  Detalhes
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate(`/collaborators/edit/${collaborator.uid}`)}
                >
                  Editar
                </Button>
                {user?.role === 'admin' && collaborator.active && user.uid !== collaborator.uid && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desativar colaborador</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja desativar este colaborador? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeactivateCollaborator(collaborator.uid)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Desativar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-10 border rounded-lg bg-muted/10">
          <h3 className="text-lg font-medium mb-2">Nenhum colaborador encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? `Não encontramos resultados para "${searchTerm}"`
              : "Nenhum colaborador cadastrado no sistema."}
          </p>
          <Button onClick={() => navigate("/collaborators/new")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Colaborador
          </Button>
        </div>
      )}
    </div>
  );
};

export default CollaboratorsPage;
