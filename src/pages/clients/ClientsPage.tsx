
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ClientsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciamento de Clientes</h1>
        <Button onClick={() => navigate("/clients/new")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>
      
      <div className="p-8 text-center text-muted-foreground">
        <p>A funcionalidade de gerenciamento de clientes será implementada em breve.</p>
      </div>
    </div>
  );
};

export default ClientsPage;
