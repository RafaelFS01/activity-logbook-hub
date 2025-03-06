
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <ShieldAlert className="h-24 w-24 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Acesso Não Autorizado</h1>
        <p className="text-muted-foreground mb-6">
          Você não tem permissão para acessar esta página. Por favor, entre em contato com um administrador ou retorne à página inicial.
        </p>
        <Button onClick={() => navigate("/")}>Voltar ao Dashboard</Button>
      </div>
    </div>
  );
};

export default Unauthorized;
