
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ref, get, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { UserRole } from "@/services/firebase/auth";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, UserCog } from "lucide-react";

// Definir o esquema de validação (similar ao NewCollaboratorPage, mas sem senha)
const collaboratorSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  birthDate: z.string(),
  admissionDate: z.string(),
  role: z.enum(["admin", "manager", "collaborator"] as const),
  active: z.boolean().default(true),
});

type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

const EditCollaboratorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      role: "collaborator",
      active: true
    }
  });

  // Carregar dados do colaborador
  useEffect(() => {
    const fetchCollaborator = async () => {
      setIsLoading(true);
      try {
        if (!id) return;
        
        const collaboratorRef = ref(db, `users/${id}`);
        const snapshot = await get(collaboratorRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setValue("name", data.name);
          setValue("email", data.email);
          setValue("cpf", data.cpf);
          setValue("phone", data.phone);
          setValue("birthDate", data.birthDate);
          setValue("admissionDate", data.admissionDate);
          setValue("role", data.role);
          setValue("active", data.active);
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Colaborador não encontrado"
          });
          navigate("/collaborators");
        }
      } catch (error: any) {
        console.error("Erro ao carregar colaborador:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: error.message || "Ocorreu um erro ao carregar os dados do colaborador."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollaborator();
  }, [id, setValue, navigate]);

  const onSubmit = async (data: CollaboratorFormValues) => {
    if (!user || !id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar autenticado para realizar esta operação."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Atualizar informações no Realtime Database
      await update(ref(db, `users/${id}`), {
        ...data,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Colaborador atualizado com sucesso",
        description: `${data.name} foi atualizado`
      });

      navigate("/collaborators");
    } catch (error: any) {
      console.error("Erro ao atualizar colaborador:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar colaborador",
        description: error.message || "Ocorreu um erro ao atualizar o colaborador."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando dados do colaborador...</p>
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
        
        <h1 className="text-3xl font-bold">Editar Colaborador</h1>
        <p className="text-muted-foreground">Atualize as informações do colaborador no sistema.</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Edição de Colaborador
          </CardTitle>
          <CardDescription>
            Todos os campos com * são obrigatórios
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  placeholder="Nome do colaborador"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  {...register("email")}
                  disabled // Email não pode ser alterado pois está vinculado à autenticação
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  {...register("cpf")}
                />
                {errors.cpf && (
                  <p className="text-sm text-red-500">{errors.cpf.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  {...register("birthDate")}
                />
                {errors.birthDate && (
                  <p className="text-sm text-red-500">{errors.birthDate.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Data de Admissão *</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  {...register("admissionDate")}
                />
                {errors.admissionDate && (
                  <p className="text-sm text-red-500">{errors.admissionDate.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <Select
                  onValueChange={(value: UserRole) => setValue("role", value)}
                  defaultValue={watch("role")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="collaborator">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <Select
                  onValueChange={(value) => setValue("active", value === "true")}
                  defaultValue={watch("active") ? "true" : "false"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/collaborators")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EditCollaboratorPage;
