
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getActivityById, updateActivity, ActivityPriority, ActivityStatus } from "@/services/firebase/activities";
import { getClients, Client } from "@/services/firebase/clients";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { parseISO } from "date-fns";

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
import { ArrowLeft, CalendarClock, Save } from "lucide-react";

interface UserData {
  uid?: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "collaborator";
  active: boolean;
}

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

const EditActivityPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
      assignedToIds: [],
    },
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const clientsData = await getClients();
        setClients(clientsData.filter(client => client.active));

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

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        if (!id) return;
        
        const activity = await getActivityById(id);
        
        if (activity) {
          setValue("title", activity.title);
          setValue("description", activity.description);
          setValue("clientId", activity.clientId);
          setValue("priority", activity.priority);
          setValue("status", activity.status);
          
          // Format the dates correctly for the date input
          if (activity.startDate) {
            // Extract just the date part from the ISO string (YYYY-MM-DD)
            const startDate = activity.startDate.split('T')[0];
            setValue("startDate", startDate);
          }
          
          if (activity.endDate) {
            // Extract just the date part from the ISO string (YYYY-MM-DD)
            const endDate = activity.endDate.split('T')[0];
            setValue("endDate", endDate);
          }
          
          setSelectedCollaborators(activity.assignedTo);
          setValue("assignedToIds", activity.assignedTo);
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Atividade não encontrada"
          });
          navigate("/activities");
        }
      } catch (error: any) {
        console.error("Erro ao carregar atividade:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: error.message || "Ocorreu um erro ao carregar os dados da atividade."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [id, setValue, navigate]);

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
    if (!user || !id) {
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
      // Ensure dates are stored in ISO format but preserve the selected date
      // This preserves the date by setting the time to noon in the local timezone
      // which prevents timezone shifts from changing the day
      const startDate = data.startDate 
        ? new Date(`${data.startDate}T12:00:00`).toISOString() 
        : '';
        
      const endDate = data.endDate 
        ? new Date(`${data.endDate}T12:00:00`).toISOString() 
        : undefined;

      const activityData = {
        title: data.title,
        description: data.description,
        clientId: data.clientId,
        assignedTo: data.assignedToIds,
        priority: data.priority as ActivityPriority,
        status: data.status as ActivityStatus,
        startDate,
        endDate,
      };

      await updateActivity(id, activityData);

      toast({
        title: "Atividade atualizada com sucesso",
        description: `A atividade "${data.title}" foi atualizada`,
      });

      navigate("/activities");
    } catch (error: any) {
      console.error("Erro ao atualizar atividade:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar atividade",
        description:
          error.message || "Ocorreu um erro ao atualizar a atividade.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayClientName = (client: Client) => {
    if (client.type === "fisica") {
      return `${client.name} (CPF: ${client.cpf})`;
    } else {
      return `${client.name} (CNPJ: ${client.cnpj})`;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando dados da atividade...</p>
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
          onClick={() => navigate("/activities")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Atividades
        </Button>

        <h1 className="text-3xl font-bold">Editar Atividade</h1>
        <p className="text-muted-foreground">
          Atualize as informações da atividade no sistema.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Edição de Atividade
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
                  defaultValue={watch("clientId")}
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
                    <SelectItem value="pending">Futura</SelectItem>
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
                            checked={selectedCollaborators.includes(collaborator.uid)}
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
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EditActivityPage;
