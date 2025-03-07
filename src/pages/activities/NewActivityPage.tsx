
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createActivity, ActivityPriority, ActivityStatus } from "@/services/firebase/activities";
import { getClients, Client } from "@/services/firebase/clients";
import { getUserData, UserData } from "@/services/firebase/auth";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CalendarClock } from "lucide-react";

const activitySchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  clientId: z.string().min(1, "Selecione um cliente"),
  assignedToIds: z.array(z.string()).min(1, "Selecione pelo menos um colaborador"),
  priority: z.enum(["low", "medium", "high"] as const),
  status: z.enum(["pending", "in-progress", "completed", "cancelled"] as const),
  startDate: z.string().min(1, "Defina uma data de início"),
  endDate: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

interface Collaborator extends UserData {
  uid: string;
}

const NewActivityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      priority: "medium",
      status: "pending",
      startDate: new Date().toISOString().split("T")[0],
      assignedToIds: [],
    },
  });

  // Carregar clientes e colaboradores
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carregar clientes
        const clientsData = await getClients();
        setClients(clientsData.filter(client => client.active));

        // Carregar colaboradores
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const collaboratorsArray = Object.entries(usersData)
            .map(([uid, data]) => ({
              uid,
              ...(data as UserData),
            }))
            .filter((user) => user.active);
          setCollaborators(collaboratorsArray);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar dados. Tente novamente mais tarde.",
        });
      }
    };

    fetchData();
  }, []);

  // Atualizar assignedToIds quando selectedCollaborators mudar
  useEffect(() => {
    setValue("assignedToIds", selectedCollaborators);
  }, [selectedCollaborators, setValue]);

  const handleCollaboratorChange = (collaboratorId: string, checked: boolean) => {
    if (checked) {
      setSelectedCollaborators((prev) => [...prev, collaboratorId]);
    } else {
      setSelectedCollaborators((prev) =>
        prev.filter((id) => id !== collaboratorId)
      );
    }
  };

  const onSubmit = async (data: ActivityFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          "Você precisa estar autenticado para realizar esta operação.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar dados da atividade
      const activityData = {
        title: data.title,
        description: data.description,
        clientId: data.clientId,
        assignedTo: data.assignedToIds,
        priority: data.priority as ActivityPriority,
        status: data.status as ActivityStatus,
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: user.uid  // Add the missing createdBy property
      };

      // Criar atividade no Firebase
      await createActivity(activityData, user.uid);

      toast({
        title: "Atividade criada com sucesso",
        description: `A atividade "${data.title}" foi adicionada`,
      });

      navigate("/activities");
    } catch (error: any) {
      console.error("Erro ao criar atividade:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar atividade",
        description:
          error.message || "Ocorreu um erro ao cadastrar a atividade.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para exibir o nome do cliente no formato correto
  const displayClientName = (client: Client) => {
    if (client.type === "fisica") {
      return `${client.name} (CPF: ${client.cpf})`;
    } else {
      return `${client.name} (CNPJ: ${client.cnpj})`;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/activities")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Atividades
        </Button>

        <h1 className="text-3xl font-bold">Nova Atividade</h1>
        <p className="text-muted-foreground">
          Preencha o formulário para adicionar uma nova atividade ao sistema.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Cadastro de Atividade
          </CardTitle>
          <CardDescription>
            Todos os campos com * são obrigatórios
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Atividade *</Label>
              <Input
                id="title"
                placeholder="Título da atividade"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva a atividade detalhadamente"
                className="min-h-[100px]"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente *</Label>
                <Select
                  onValueChange={(value) => setValue("clientId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {displayClientName(client)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-sm text-red-500">
                    {errors.clientId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade *</Label>
                <Select
                  defaultValue={watch("priority")}
                  onValueChange={(value: ActivityPriority) =>
                    setValue("priority", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-red-500">
                    {errors.priority.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  defaultValue={watch("status")}
                  onValueChange={(value: ActivityStatus) =>
                    setValue("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in-progress">Em andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-500">{errors.status.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início *</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register("startDate")}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Término</Label>
                <Input id="endDate" type="date" {...register("endDate")} />
                {errors.endDate && (
                  <p className="text-sm text-red-500">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Colaboradores Responsáveis *</Label>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="collaborators">
                  <AccordionTrigger className="py-3">
                    Selecione os colaboradores
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto p-2">
                      {collaborators.map((collaborator) => (
                        <div
                          key={collaborator.uid}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`collaborator-${collaborator.uid}`}
                            onCheckedChange={(checked) =>
                              handleCollaboratorChange(
                                collaborator.uid,
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor={`collaborator-${collaborator.uid}`}
                            className="cursor-pointer"
                          >
                            {collaborator.name} ({collaborator.role === "admin"
                              ? "Administrador"
                              : collaborator.role === "manager"
                              ? "Gerente"
                              : "Colaborador"}
                            )
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              {errors.assignedToIds && (
                <p className="text-sm text-red-500">
                  {errors.assignedToIds.message}
                </p>
              )}
              <div className="mt-2">
                <p className="text-sm">
                  Selecionados:{" "}
                  {selectedCollaborators.length === 0
                    ? "Nenhum"
                    : selectedCollaborators.length}
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/activities")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Cadastrando..." : "Cadastrar Atividade"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default NewActivityPage;
