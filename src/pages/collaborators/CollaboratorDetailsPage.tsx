import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon, Mail, Phone, User, Badge } from "lucide-react";

interface UserData {
  uid?: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  admissionDate: string;
  role: "admin" | "manager" | "collaborator";
  active: boolean;
}

const CollaboratorDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [collaborator, setCollaborator] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startDateOpen, setStartDateOpen] = useState(false);

  useEffect(() => {
    const fetchCollaborator = async () => {
      setIsLoading(true);
      try {
        if (!id) return;

        const collaboratorRef = ref(db, `users/${id}`);
        const snapshot = await get(collaboratorRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setCollaborator(data);
          if (data.admissionDate) {
            setStartDate(new Date(data.admissionDate));
          }
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Colaborador não encontrado",
          });
          navigate("/collaborators");
        }
      } catch (error: any) {
        console.error("Erro ao carregar colaborador:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description:
            error.message || "Ocorreu um erro ao carregar os dados do colaborador.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollaborator();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              Carregando dados do colaborador...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!collaborator) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground">Colaborador não encontrado.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/collaborators")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Colaboradores
        </Button>

        <h1 className="text-3xl font-bold">Detalhes do Colaborador</h1>
        <p className="text-muted-foreground">
          Visualize as informações detalhadas do colaborador.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Colaborador
          </CardTitle>
          <CardDescription>
            Detalhes completos sobre o colaborador.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <p className="text-sm font-medium">{String(collaborator.name)}</p>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-sm font-medium">{collaborator.email}</p>
          </div>

          <div className="space-y-2">
            <Label>CPF</Label>
            <p className="text-sm font-medium">{collaborator.cpf}</p>
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <p className="text-sm font-medium">{collaborator.phone}</p>
          </div>

          <div className="space-y-2">
            <Label>Data de Nascimento</Label>
            <p className="text-sm font-medium">
              {format(new Date(collaborator.birthDate), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Data de Admissão</Label>
            <p className="text-sm font-medium">
              {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Não definida"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Função</Label>
            <p className="text-sm font-medium">
              {collaborator.role === "admin"
                ? "Administrador"
                : collaborator.role === "manager"
                  ? "Gerente"
                  : "Colaborador"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <p className="text-sm font-medium">{collaborator.active ? "Ativo" : "Inativo"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollaboratorDetailsPage;

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{children}</div>;
}
