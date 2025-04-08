import { useState, useEffect, useMemo } from "react"; // Adicionado useMemo
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserCheck, UserX, Trash2, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
// Removido getUserData se não for usado diretamente, auth também se não for usado
import { UserData } from "@/services/firebase/auth";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { get, ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { exportCollaboratorsToExcel } from "@/utils/exportUtils";

// Constante para itens por página
const ITEMS_PER_PAGE = 15;

// Definindo um tipo mais completo que inclui uid e garante active opcional
type Collaborator = UserData & { uid: string; active?: boolean };

const CollaboratorsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Usuário logado para verificações de permissão
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [filteredCollaborators, setFilteredCollaborators] = useState<Collaborator[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // Estado para a página atual da paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Busca inicial de colaboradores
  useEffect(() => {
    const fetchCollaborators = async () => {
      setIsLoading(true);
      try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const collaboratorsArray: Collaborator[] = Object.entries(usersData).map(([uid, data]) => ({
            uid,
            ...(data as UserData),
            active: (data as UserData).active !== false // Garante que 'active' seja true por padrão se não existir ou for true
          }));

          setCollaborators(collaboratorsArray);
          // Inicialmente, filtramos para mostrar apenas ativos, se essa for a regra
          // const activeCollaborators = collaboratorsArray.filter(c => c.active);
          // setFilteredCollaborators(activeCollaborators);
          // Se for para mostrar todos inicialmente (ativos e inativos):
          setFilteredCollaborators(collaboratorsArray);

        } else {
          setCollaborators([]);
          setFilteredCollaborators([]);
        }
      } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar Colaboradores",
          description: "Não foi possível buscar a lista de colaboradores."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollaborators();
  }, []); // Roda apenas uma vez na montagem

  // Efeito para filtrar e ordenar colaboradores
  useEffect(() => {
    // Começa com a lista completa
    let filtered = [...collaborators];

    // Filtra para mostrar apenas ativos (DESCOMENTE A LINHA ABAIXO SE QUISER SEMPRE FILTRAR ATIVOS)
    // filtered = filtered.filter(c => c.active !== false);

    // Aplica filtro de termo de busca
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
          (collaborator) =>
              (collaborator.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
              (collaborator.email?.toLowerCase() || '').includes(lowerSearchTerm) ||
              (collaborator.cpf?.replace(/[^\d]/g, '') || '').includes(lowerSearchTerm.replace(/[^\d]/g, '')) || // Busca por CPF (removendo máscara)
              (collaborator.phone?.replace(/[^\d]/g, '') || '').includes(lowerSearchTerm.replace(/[^\d]/g, '')) // Busca por Telefone (removendo máscara)
      );
    }

    // Ordena os colaboradores (ex: por nome)
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    setFilteredCollaborators(filtered);
    // Reseta para a primeira página sempre que os filtros mudam
    setCurrentPage(1);

  }, [searchTerm, collaborators]); // Depende do termo de busca e da lista base

  // Calcula os colaboradores para a página atual usando useMemo
  const paginatedCollaborators = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCollaborators.slice(startIndex, endIndex);
  }, [filteredCollaborators, currentPage]); // Recalcula quando filtrados ou página mudam

  // Calcula o número total de páginas usando useMemo
  const totalPages = useMemo(() => {
    return Math.ceil(filteredCollaborators.length / ITEMS_PER_PAGE);
  }, [filteredCollaborators]); // Recalcula quando filtrados mudam

  // Efeito para rolar para o topo ao mudar de página
  useEffect(() => {
    // Evita scroll na montagem inicial se currentPage for 1
    if (currentPage > 0) { // Condição simples, pode ser mais específica se necessário
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // --- Funções Auxiliares e Handlers ---

  const getRoleBadge = (role: string | undefined) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Administrador</Badge>;
      case "manager":
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Gerente</Badge>; // Exemplo de cor diferente
      case "collaborator":
        return <Badge variant="secondary">Colaborador</Badge>; // Usar secondary ou outline
      default:
        return <Badge variant="outline">Indefinido</Badge>; // Role padrão ou desconhecida
    }
  };

  const handleDeactivateCollaborator = async (collaboratorId: string) => {
    const originalCollaborators = [...collaborators]; // Guarda estado para rollback
    try {
      // Atualiza estado local otimisticamente
      const updatedCollaborators = collaborators.map(collab =>
          collab.uid === collaboratorId ? { ...collab, active: false } : collab
      );
      setCollaborators(updatedCollaborators); // Atualiza a lista base

      // Atualiza no Firebase
      const userRef = ref(db, `users/${collaboratorId}`);
      await update(userRef, {
        active: false,
        updatedAt: new Date().toISOString() // Adiciona timestamp da atualização
      });

      toast({
        title: "Colaborador desativado",
        description: "O colaborador foi marcado como inativo com sucesso."
      });
    } catch (error) {
      console.error("Erro ao desativar colaborador:", error);
      // Rollback em caso de erro
      setCollaborators(originalCollaborators);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível desativar o colaborador. Tente novamente."
      });
    }
  };

  // Função para reativar colaborador (exemplo, pode ser adicionada)
  const handleActivateCollaborator = async (collaboratorId: string) => {
    const originalCollaborators = [...collaborators];
    try {
      const updatedCollaborators = collaborators.map(collab =>
          collab.uid === collaboratorId ? { ...collab, active: true } : collab
      );
      setCollaborators(updatedCollaborators);

      const userRef = ref(db, `users/${collaboratorId}`);
      await update(userRef, {
        active: true,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Colaborador reativado",
        description: "O colaborador foi marcado como ativo com sucesso."
      });
    } catch (error) {
      console.error("Erro ao reativar colaborador:", error);
      setCollaborators(originalCollaborators);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível reativar o colaborador."
      });
    }
  };


  const handleExport = () => {
    // Exporta apenas os colaboradores filtrados (todos eles, não apenas a página atual)
    if (filteredCollaborators.length === 0) {
      toast({
        variant: "destructive",
        title: "Sem dados para exportar",
        description: "Não há colaboradores para exportar com os filtros atuais."
      });
      return;
    }

    try {
      // Passa a lista filtrada completa para a função de exportação
      exportCollaboratorsToExcel(filteredCollaborators, 'colaboradores_exportados.xlsx');

      toast({
        title: "Exportação Iniciada",
        description: `${filteredCollaborators.length} colaboradores estão sendo preparados para exportação.`
      });
    } catch (error) {
      console.error('Erro ao exportar colaboradores:', error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: `Não foi possível exportar os colaboradores. ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // --- Renderização do Componente ---
  return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Gerenciamento de Colaboradores</h1>
          <div className="flex flex-wrap gap-2"> {/* Adicionado flex-wrap */}
            <Button variant="outline" onClick={handleExport} disabled={isLoading || filteredCollaborators.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Visíveis
            </Button>
            {/* Apenas Admin pode criar novos colaboradores */}
            {user?.role === 'admin' && (
                <Button onClick={() => navigate("/collaborators/new")} disabled={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Colaborador
                </Button>
            )}
          </div>
        </div>

        {/* Filtro de Busca */}
        <div className="relative mb-6">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
              type="search"
              placeholder="Buscar por nome, email, CPF, telefone..."
              className="pl-8 w-full" // Garantir w-full
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
          />
        </div>

        {/* Conteúdo Principal: Loading, Lista de Colaboradores ou Mensagem Vazia */}
        {isLoading ? (
            // Indicador de Carregamento (Skeletons)
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-3/4 mb-1" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3">
                      <Skeleton className="h-9 w-full" />
                    </CardFooter>
                  </Card>
              ))}
            </div>
        ) : filteredCollaborators.length > 0 ? (
            // Lista de Colaboradores Paginada + Controles de Paginação
            <> {/* Fragmento para agrupar grid e paginação */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Mapeia sobre os colaboradores da página atual */}
                {paginatedCollaborators.map((collaborator) => (
                    <Card key={collaborator.uid} className={`overflow-hidden flex flex-col ${!collaborator.active ? 'opacity-60 bg-muted/30' : ''}`}> {/* Estilo para inativos */}
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 overflow-hidden">
                            <CardTitle className="text-lg truncate">{collaborator.name || 'Nome não definido'}</CardTitle>
                            <CardDescription className="truncate">{collaborator.email || 'Email não definido'}</CardDescription>
                          </div>
                          <div className="flex flex-col gap-1 items-end flex-shrink-0">
                            {getRoleBadge(collaborator.role)}
                            {/* Badge de Ativo/Inativo */}
                            {collaborator.active !== false ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                                  <UserCheck className="h-3 w-3 mr-1" /> Ativo
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">
                                  <UserX className="h-3 w-3 mr-1" /> Inativo
                                </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-1 text-sm pb-3">
                        <p><span className="font-medium">CPF:</span> {collaborator.cpf || 'N/D'}</p>
                        <p><span className="font-medium">Telefone:</span> {collaborator.phone || 'N/D'}</p>
                        {collaborator.admissionDate && (
                            <p><span className="font-medium">Admissão:</span>
                              { /* Tratamento de data inválida */ }
                              { !isNaN(new Date(collaborator.admissionDate).getTime())
                                  ? new Date(collaborator.admissionDate).toLocaleDateString('pt-BR')
                                  : 'Data inválida'
                              }
                            </p>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 pt-3 border-t">
                        {/* Botão Detalhes (se houver página de detalhes) */}
                        {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/collaborators/${collaborator.uid}`)}
                  >
                    Detalhes
                  </Button> */}
                        {/* Botão Editar (Apenas Admin ou o próprio Gerente/Colaborador?) */}
                        {(user?.role === 'admin' || user?.uid === collaborator.uid) && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => navigate(`/collaborators/edit/${collaborator.uid}`)}
                            >
                              Editar
                            </Button>
                        )}
                        {/* Botão Desativar/Reativar (Apenas Admin, não pode desativar a si mesmo) */}
                        {user?.role === 'admin' && user.uid !== collaborator.uid && (
                            <>
                              {collaborator.active !== false ? (
                                  // Botão Desativar
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                          variant="destructive"
                                          size="sm"
                                          title="Desativar Colaborador"
                                      >
                                        <UserX className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Desativação</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja desativar o colaborador "{collaborator.name}"? Ele perderá o acesso ao sistema.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => handleDeactivateCollaborator(collaborator.uid)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Confirmar Desativação
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                              ) : (
                                  // Botão Reativar
                                  <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-green-500 text-green-700 hover:bg-green-50 hover:text-green-800"
                                      title="Reativar Colaborador"
                                      onClick={() => handleActivateCollaborator(collaborator.uid)}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                              )}
                            </>
                        )}
                      </CardFooter>
                    </Card>
                ))}
              </div> {/* Fim da Grid de Colaboradores */}

              {/* Controles de Paginação */}
              {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-8 mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                Página {currentPage} de {totalPages}
              </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
              )}
            </> // Fim do Fragmento
        ) : (
            // Mensagem de Nenhum Colaborador Encontrado
            <div className="text-center p-10 border rounded-lg bg-card shadow-sm mt-6">
              <h3 className="text-xl font-semibold mb-2">Nenhum colaborador encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                    ? `Não encontramos colaboradores que correspondam à busca "${searchTerm}".`
                    : "Nenhum colaborador cadastrado ou visível no sistema."}
              </p>
              {searchTerm ? ( // Botão para limpar busca se houver termo
                  <Button
                      variant="outline"
                      onClick={() => setSearchTerm('')}
                      className="mr-2"
                  >
                    Limpar Busca
                  </Button>
              ) : null}
              {user?.role === 'admin' && ( // Botão para adicionar novo (apenas admin)
                  <Button onClick={() => navigate("/collaborators/new")}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Colaborador
                  </Button>
              )}
            </div>
        )}
      </div> // Fim do Container Principal
  );
};

export default CollaboratorsPage;