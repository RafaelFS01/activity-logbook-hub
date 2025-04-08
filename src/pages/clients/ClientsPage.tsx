import { useState, useEffect, useMemo } from "react"; // Adicionado useMemo
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Building2, User, CheckCircle2, XCircle, Trash2, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getClients, Client, ClientType, deleteClient } from "@/services/firebase/clients";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { exportClientsToExcel } from "@/utils/exportUtils";

// Constante para itens por página
const ITEMS_PER_PAGE = 15;

const ClientsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ClientType>("all");
  // Estado para a página atual da paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Busca inicial de clientes
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const fetchedClients = await getClients();
        // Filtra inicialmente para mostrar apenas clientes ativos, se necessário
        // const activeClients = fetchedClients.filter(client => client.active !== false);
        // Se não precisar filtrar por ativo aqui, use fetchedClients diretamente:
        setClients(fetchedClients);
        setFilteredClients(fetchedClients); // Inicializa filtrados com todos
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar Clientes",
          description: "Não foi possível buscar a lista de clientes."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []); // Roda apenas uma vez na montagem

  // Efeito para filtrar e ordenar clientes
  useEffect(() => {
    // Começa com a lista completa de clientes (ou apenas ativos, dependendo da regra)
    let filtered = clients.filter(client => client.active !== false); // Garante que apenas ativos sejam considerados para filtragem e exibição

    // Aplica filtro de tipo (Pessoa Física/Jurídica)
    if (filter !== "all") {
      filtered = filtered.filter(client => client.type === filter);
    }

    // Aplica filtro de termo de busca
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(client => {
        const nameField = client.type === 'juridica'
            ? (client as any).companyName?.toLowerCase() || ''
            : client.name?.toLowerCase() || '';
        const emailField = client.email?.toLowerCase() || '';
        const phoneField = client.phone?.toLowerCase() || '';
        const documentField = client.type === 'juridica'
            ? (client as any).cnpj?.toLowerCase() || ''
            : (client as any).cpf?.toLowerCase() || '';

        return nameField.includes(lowerSearchTerm) ||
            emailField.includes(lowerSearchTerm) ||
            phoneField.includes(lowerSearchTerm) ||
            documentField.includes(lowerSearchTerm);
      });
    }

    // Ordena os clientes (ex: por nome ou nome da empresa)
    filtered.sort((a, b) => {
      const nameA = a.type === 'juridica' ? (a as any).companyName || '' : a.name || '';
      const nameB = b.type === 'juridica' ? (b as any).companyName || '' : b.name || '';
      return nameA.localeCompare(nameB);
    });

    setFilteredClients(filtered);
    // Reseta para a primeira página sempre que os filtros mudam
    setCurrentPage(1);
  }, [searchTerm, filter, clients]); // Depende dos filtros e da lista base

  // Calcula os clientes para a página atual usando useMemo
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredClients.slice(startIndex, endIndex);
  }, [filteredClients, currentPage]); // Recalcula quando filtrados ou página mudam

  // Calcula o número total de páginas usando useMemo
  const totalPages = useMemo(() => {
    return Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  }, [filteredClients]); // Recalcula quando filtrados mudam

  // Efeito para rolar para o topo ao mudar de página
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // --- Funções Auxiliares e Handlers ---

  const getClientTypeIcon = (type: ClientType) => {
    return type === 'juridica' ?
        <Building2 className="h-4 w-4 mr-1" /> :
        <User className="h-4 w-4 mr-1" />;
  };

  const getClientBadge = (type: ClientType) => {
    return type === 'juridica' ? (
        <Badge variant="secondary" className="flex items-center">
          <Building2 className="h-3 w-3 mr-1" />
          Pessoa Jurídica
        </Badge>
    ) : (
        <Badge variant="outline" className="flex items-center">
          <User className="h-3 w-3 mr-1" />
          Pessoa Física
        </Badge>
    );
  };

  const handleDeleteClient = async (clientId: string) => {
    const originalClients = [...clients]; // Guarda estado original para rollback
    try {
      // Atualiza estado local otimisticamente (remove da lista visível)
      const updatedClients = clients.filter(client => client.id !== clientId);
      // Ou marca como inativo se a lógica for essa:
      // const updatedClients = clients.map(client =>
      //   client.id === clientId ? { ...client, active: false } : client
      // );
      setClients(updatedClients); // Atualiza a lista base

      // Chama a função de serviço para deletar/desativar no backend
      await deleteClient(clientId); // Assumindo que deleteClient desativa

      toast({
        title: "Cliente desativado",
        description: "O cliente foi marcado como inativo com sucesso."
      });
    } catch (error) {
      console.error("Erro ao desativar cliente:", error);
      // Rollback em caso de erro
      setClients(originalClients);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível desativar o cliente. Tente novamente."
      });
    }
  };

  const handleExport = () => {
    // Exporta apenas os clientes filtrados (todos eles, não apenas a página atual)
    if (filteredClients.length === 0) {
      toast({
        variant: "destructive",
        title: "Sem dados para exportar",
        description: "Não há clientes para exportar com os filtros atuais."
      });
      return;
    }

    try {
      // Passa a lista filtrada completa para a função de exportação
      exportClientsToExcel(filteredClients, 'clientes_exportados.xlsx');

      toast({
        title: "Exportação Iniciada",
        description: `${filteredClients.length} clientes estão sendo preparados para exportação.`
      });
    } catch (error) {
      console.error('Erro ao exportar clientes:', error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: `Não foi possível exportar os clientes. ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // --- Renderização do Componente ---
  return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Gerenciamento de Clientes</h1>
          <div className="flex flex-wrap gap-2"> {/* Adicionado flex-wrap */}
            <Button variant="outline" onClick={handleExport} disabled={isLoading || filteredClients.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Visíveis
            </Button>
            <Button onClick={() => navigate("/clients/new")} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]"> {/* Adicionado min-width */}
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Buscar por nome, empresa, email, doc..."
                className="pl-8 w-full" // Garantir w-full
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
            />
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap"> {/* Adicionado flex-wrap */}
            <Button
                variant={filter === "all" ? "secondary" : "outline"} // Usar secondary para ativo
                size="sm"
                onClick={() => setFilter("all")}
                disabled={isLoading}
            >
              Todos
            </Button>
            <Button
                variant={filter === "fisica" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilter("fisica")}
                disabled={isLoading}
            >
              <User className="h-4 w-4 mr-1" />
              Pessoa Física
            </Button>
            <Button
                variant={filter === "juridica" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilter("juridica")}
                disabled={isLoading}
            >
              <Building2 className="h-4 w-4 mr-1" />
              Pessoa Jurídica
            </Button>
          </div>
        </div>

        {/* Conteúdo Principal: Loading, Lista de Clientes ou Mensagem Vazia */}
        {isLoading ? (
            // Indicador de Carregamento (Skeletons)
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-3/4 mb-1" /> {/* Ajustado tamanho */}
                      <Skeleton className="h-4 w-1/2" />      {/* Ajustado tamanho */}
                    </CardHeader>
                    <CardContent className="pb-3"> {/* Ajustado padding */}
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" /> {/* Ajustado tamanho */}
                        <Skeleton className="h-4 w-5/6" /> {/* Ajustado tamanho */}
                        <Skeleton className="h-4 w-2/3" /> {/* Ajustado tamanho */}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3"> {/* Ajustado padding */}
                      <Skeleton className="h-9 w-full" /> {/* Ajustado tamanho */}
                    </CardFooter>
                  </Card>
              ))}
            </div>
        ) : filteredClients.length > 0 ? (
            // Lista de Clientes Paginada + Controles de Paginação
            <> {/* Fragmento para agrupar grid e paginação */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Mapeia sobre os clientes da página atual */}
                {paginatedClients.map((client) => (
                    <Card key={client.id} className="overflow-hidden flex flex-col"> {/* flex flex-col para footer */}
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 overflow-hidden"> {/* Evitar overflow do título */}
                            <CardTitle className="text-lg truncate"> {/* Truncar texto longo */}
                              {client.type === 'juridica'
                                  ? (client as any).companyName || 'Empresa sem nome'
                                  : client.name || 'Cliente sem nome'
                              }
                            </CardTitle>
                            <CardDescription className="truncate">{client.email || 'Sem email'}</CardDescription>
                          </div>
                          <div className="flex flex-col gap-1 items-end flex-shrink-0">
                            {getClientBadge(client.type)}
                            {/* Badge de Ativo/Inativo (removido se a lista só mostra ativos) */}
                            {/* {client.active !== false ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">
                          <XCircle className="h-3 w-3 mr-1" /> Inativo
                        </Badge>
                      )} */}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-1 text-sm pb-3"> {/* flex-grow e padding */}
                        <p><span className="font-medium">Telefone:</span> {client.phone || 'N/D'}</p>
                        {client.type === 'fisica' ? (
                            <p><span className="font-medium">CPF:</span> {(client as any).cpf || 'N/D'}</p>
                        ) : (
                            <p><span className="font-medium">CNPJ:</span> {(client as any).cnpj || 'N/D'}</p>
                        )}
                        {client.address && (
                            <p className="line-clamp-2"><span className="font-medium">Endereço:</span> {client.address}</p> // line-clamp
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 pt-3 border-t"> {/* border-t e padding */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          Detalhes
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/clients/edit/${client.id}`)}
                        >
                          Editar
                        </Button>
                        {/* Botão Desativar (Excluir) - Apenas para Admin e se cliente estiver ativo */}
                        {user?.role === 'admin' && client.active !== false && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    title="Desativar Cliente" // Adicionado title
                                >
                                  <Trash2 className="h-4 w-4" /> {/* Removido mr-1 se quiser só ícone em telas menores */}
                                  {/* <span className="hidden sm:inline ml-1">Desativar</span> */} {/* Opcional: texto */}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Desativação</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja desativar o cliente "{client.type === 'juridica' ? (client as any).companyName : client.name}"?
                                    Ele não aparecerá mais nas listas ativas. Esta ação geralmente pode ser revertida pelo administrador.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                      onClick={() => handleDeleteClient(client.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Confirmar Desativação
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        )}
                      </CardFooter>
                    </Card>
                ))}
              </div> {/* Fim da Grid de Clientes */}

              {/* Controles de Paginação */}
              {/* Exibe os controles apenas se houver mais de uma página */}
              {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-8 mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} // Garante não ir abaixo de 1
                        disabled={currentPage === 1} // Desabilita na primeira página
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                Página {currentPage} de {totalPages}
              </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} // Garante não ir acima de totalPages
                        disabled={currentPage === totalPages} // Desabilita na última página
                    >
                      Próxima
                    </Button>
                  </div>
              )}
            </> // Fim do Fragmento
        ) : (
            // Mensagem de Nenhum Cliente Encontrado
            <div className="text-center p-10 border rounded-lg bg-card shadow-sm mt-6"> {/* Usando bg-card */}
              <h3 className="text-xl font-semibold mb-2">Nenhum cliente encontrado</h3> {/* Aumentado texto */}
              <p className="text-muted-foreground mb-4">
                {searchTerm || filter !== "all"
                    ? "Não encontramos clientes ativos que correspondam aos seus filtros."
                    : "Nenhum cliente ativo cadastrado no sistema."}
              </p>
              {searchTerm || filter !== "all" ? ( // Botão para limpar filtros
                  <Button
                      variant="outline"
                      onClick={() => { setSearchTerm(''); setFilter('all'); }}
                      className="mr-2"
                  >
                    Limpar Filtros
                  </Button>
              ) : null}
              <Button onClick={() => navigate("/clients/new")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Novo Cliente
              </Button>
            </div>
        )}
      </div> // Fim do Container Principal
  );
};

export default ClientsPage;