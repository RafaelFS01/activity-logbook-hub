import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserData, UserData } from "@/services/firebase/auth";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, Calendar } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { update, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";

const CollaboratorDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: loggedInUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const user = await getUserData(id);
        if (user) {
          setUserData(user);
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Colaborador não encontrado."
          });
          navigate("/collaborators");
        }
      } catch (error) {
        console.error("Erro ao buscar dados do colaborador:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os dados do colaborador."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [id, navigate, toast]);

  const formattedUserData = userData ? {
    Nome: userData.name,
    Email: userData.email,
    CPF: userData.cpf,
    Telefone: userData.phone,
    "Data de Nascimento": userData.birthDate,
    "Data de Admissão": userData.admissionDate,
    Função: userData.role,
    Ativo: userData.active ? "Sim" : "Não",
  } : {};

  const handleDeleteCollaborator = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      // Update the user's active status to false in the database
      await update(ref(db, `users/${id}`), { active: false });

      // Update the local state
      setUserData(prev => prev ? { ...prev, active: false } : null);

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
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Detalhes do Colaborador</h1>
        <Button onClick={() => navigate("/collaborators")} variant="outline">
          Voltar para a lista
        </Button>
      </div>

      {isLoading ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ) : !userData ? (
        <Card className="text-center p-10 border rounded-lg bg-muted/10">
          <CardHeader>
            <CardTitle>Colaborador não encontrado</CardTitle>
            <CardDescription>Não foi possível carregar os detalhes deste colaborador.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-semibold">{userData.name}</CardTitle>
                <CardDescription>{userData.email}</CardDescription>
              </div>
              <Badge variant="secondary">{userData.role}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 py-3 border-b">
                <div className="font-medium text-muted-foreground">Status</div>
                <div className="col-span-2">
                  {userData.active ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">
                      Inativo
                    </Badge>
                  )}
                </div>
              </div>

              {Object.entries(formattedUserData).map(([field, value]) => (
                <div key={field} className="grid grid-cols-3 gap-4 py-3 border-b">
                  <div className="font-medium text-muted-foreground">{field}</div>
                  <div className="col-span-2">
                    {typeof value === 'object' ? JSON.stringify(value) : value?.toString() || ''}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (id) {
                  navigate(`/collaborators/edit/${id}`);
                }
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            {loggedInUser?.role === 'admin' && userData.active && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Desativar Colaborador
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
                      onClick={handleDeleteCollaborator}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          Desativando...
                        </>
                      ) : (
                        "Desativar"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default CollaboratorDetailsPage;
