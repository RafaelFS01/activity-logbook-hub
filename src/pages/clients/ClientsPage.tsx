import { useState, useEffect } from "react";
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

const ClientsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ClientType>("all");

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const fetchedClients = await getClients();
        setClients(fetchedClients);
        setFilteredClients(fetchedClients);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  useEffect(() => {
    let filtered = clients;
    
    if (filter !== "all") {
      filtered = filtered.filter(client => client.type === filter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(client => {
        const nameField = client.type === 'juridica' 
          ? (client as any).companyName || ''
          : client.name || '';
          
        return nameField.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.phone.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    setFilteredClients(filtered);
  }, [searchTerm, filter, clients]);

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
    try {
      await deleteClient(clientId);
      const updatedClients = clients.map(client => 
        client.id === clientId ? { ...client, active: false } : client
      );
      setClients(updatedClients);
      
      toast({
        title: "Cliente desativado",
        description: "O cliente foi desativado com sucesso."
      });
    } catch (error) {
      console.error("Erro ao desativar cliente:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível desativar o cliente."
      });
    }
  };

  const handleExport = () => {
    if (filteredClients.length === 0) {
      toast({
        variant: "destructive",
        title: "Sem dados para exportar",
        description: "Não há clientes para exportar com os filtros atuais."
      });
      return;
    }

    try {
      exportClientsToExcel(filteredClients, 'clientes.xlsx');
      
      toast({
        title: "Exportação concluída",
        description: `${filteredClients.length} clientes foram exportados com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao exportar clientes:', error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar os clientes."
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Gerenciamento de Clientes</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar para Excel
          </Button>
          <Button onClick={() => navigate("/clients/new")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar clientes..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
          <Button 
            variant={filter === "fisica" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("fisica")}
          >
            <User className="h-4 w-4 mr-1" />
            Pessoa Física
          </Button>
          <Button 
            variant={filter === "juridica" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("juridica")}
          >
            <Building2 className="h-4 w-4 mr-1" />
            Pessoa Jurídica
          </Button>
        </div>
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
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {client.type === 'juridica' 
                        ? (client as any).companyName
                        : client.name
                      }
                    </CardTitle>
                    <CardDescription>{client.email}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {getClientBadge(client.type)}
                    {client.active ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">
                        <XCircle className="h-3 w-3 mr-1" /> Inativo
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Telefone:</span> {client.phone}</p>
                  {client.type === 'fisica' ? (
                    <p><span className="font-medium">CPF:</span> {(client as any).cpf}</p>
                  ) : (
                    <p><span className="font-medium">CNPJ:</span> {(client as any).cnpj}</p>
                  )}
                  {client.address && (
                    <p><span className="font-medium">Endereço:</span> {client.address}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
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
                {user?.role === 'admin' && client.active && (
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
                        <AlertDialogTitle>Desativar cliente</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja desativar este cliente? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteClient(client.id)}
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
          <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filter !== "all"
              ? "Não encontramos resultados com os filtros aplicados."
              : "Nenhum cliente cadastrado no sistema."}
          </p>
          <Button onClick={() => navigate("/clients/new")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Cliente
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
