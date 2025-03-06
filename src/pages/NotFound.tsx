
import { Button } from "@/components/ui/button";
import { FolderX } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <FolderX className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Página Não Encontrada</h2>
        <p className="text-muted-foreground mb-6">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Button onClick={() => navigate("/")}>Voltar à Página Inicial</Button>
      </div>
    </div>
  );
};

export default NotFound;
