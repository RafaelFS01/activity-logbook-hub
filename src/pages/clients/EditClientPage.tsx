
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getClientById, updateClient, ClientType } from "@/services/firebase/clients";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Briefcase, Building2, Save, User } from "lucide-react";

// Schema for pessoa física
const pessoaFisicaSchema = z.object({
  type: z.literal("fisica"),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  rg: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().default(true),
});

// Schema for pessoa jurídica
const pessoaJuridicaSchema = z.object({
  type: z.literal("juridica"),
  companyName: z.string().min(3, "Razão social deve ter pelo menos 3 caracteres"),
  name: z.string().min(3, "Nome fantasia deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  responsibleName: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().default(true),
});

// Union of schemas with type discriminator
const clientSchema = z.discriminatedUnion("type", [
  pessoaFisicaSchema,
  pessoaJuridicaSchema,
]);

type PessoaFisicaFormValues = z.infer<typeof pessoaFisicaSchema>;
type PessoaJuridicaFormValues = z.infer<typeof pessoaJuridicaSchema>;
type ClientFormValues = PessoaFisicaFormValues | PessoaJuridicaFormValues;

const EditClientPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [clientType, setClientType] = useState<ClientType>("fisica");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: "fisica",
      active: true,
    } as PessoaFisicaFormValues,
  });

  // Carregar dados do cliente
  useEffect(() => {
    const fetchClient = async () => {
      setIsLoading(true);
      try {
        if (!id) return;
        
        const client = await getClientById(id);
        
        if (client) {
          setClientType(client.type);
          
          if (client.type === "fisica") {
            reset({
              type: "fisica",
              name: client.name,
              email: client.email,
              phone: client.phone,
              cpf: (client as any).cpf,
              rg: (client as any).rg || "",
              address: client.address || "",
              active: client.active,
            } as PessoaFisicaFormValues);
          } else {
            reset({
              type: "juridica",
              name: client.name,
              companyName: (client as any).companyName,
              email: client.email,
              phone: client.phone,
              cnpj: (client as any).cnpj,
              responsibleName: (client as any).responsibleName || "",
              address: client.address || "",
              active: client.active,
            } as PessoaJuridicaFormValues);
          }
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Cliente não encontrado"
          });
          navigate("/clients");
        }
      } catch (error: any) {
        console.error("Erro ao carregar cliente:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: error.message || "Ocorreu um erro ao carregar os dados do cliente."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [id, reset, navigate]);

  // Type guard functions for proper error handling
  const isPessoaFisica = (
    data: ClientFormValues
  ): data is PessoaFisicaFormValues => {
    return data.type === "fisica";
  };

  const isPessoaJuridica = (
    data: ClientFormValues
  ): data is PessoaJuridicaFormValues => {
    return data.type === "juridica";
  };

  const onSubmit = async (data: ClientFormValues) => {
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
      // Atualizar cliente no Firebase
      await updateClient(id, data);

      toast({
        title: "Cliente atualizado com sucesso",
        description: `${data.name} foi atualizado com sucesso`
      });

      navigate("/clients");
    } catch (error: any) {
      console.error("Erro ao atualizar cliente:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar cliente",
        description: error.message || "Ocorreu um erro ao atualizar o cliente."
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
            <p className="mt-4 text-muted-foreground">Carregando dados do cliente...</p>
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
          onClick={() => navigate("/clients")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Clientes
        </Button>

        <h1 className="text-3xl font-bold">Editar Cliente</h1>
        <p className="text-muted-foreground">
          Atualize as informações do cliente no sistema.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Edição de Cliente
          </CardTitle>
          <CardDescription>
            Todos os campos com * são obrigatórios
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <Tabs
              value={clientType}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fisica" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Pessoa Física
                </TabsTrigger>
                <TabsTrigger value="juridica" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Pessoa Jurídica
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fisica" className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-fisica">Nome completo *</Label>
                    <Input
                      id="name-fisica"
                      placeholder="Nome do cliente"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      {...register("cpf")}
                    />
                    {clientType === "fisica" && 
                     errors.cpf && isPessoaFisica(watch()) && (
                      <p className="text-sm text-red-500">{(errors as any).cpf?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      placeholder="00.000.000-0"
                      {...register("rg")}
                    />
                    {clientType === "fisica" && 
                     errors.rg && isPessoaFisica(watch()) && (
                      <p className="text-sm text-red-500">{(errors as any).rg?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-fisica">Email *</Label>
                    <Input
                      id="email-fisica"
                      type="email"
                      placeholder="email@exemplo.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-fisica">Telefone *</Label>
                    <Input
                      id="phone-fisica"
                      placeholder="(00) 00000-0000"
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address-fisica">Endereço</Label>
                    <Input
                      id="address-fisica"
                      placeholder="Endereço completo"
                      {...register("address")}
                    />
                    {errors.address && (
                      <p className="text-sm text-red-500">{errors.address.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="active-fisica">Status</Label>
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
                  
                  {/* Hidden input to ensure type is always set correctly */}
                  <input type="hidden" {...register("type")} value="fisica" />
                </div>
              </TabsContent>

              <TabsContent value="juridica" className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Razão Social *</Label>
                    <Input
                      id="companyName"
                      placeholder="Razão Social"
                      {...register("companyName")}
                    />
                    {clientType === "juridica" && 
                     errors.companyName && isPessoaJuridica(watch()) && (
                      <p className="text-sm text-red-500">{(errors as any).companyName?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name-juridica">Nome Fantasia *</Label>
                    <Input
                      id="name-juridica"
                      placeholder="Nome Fantasia"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      {...register("cnpj")}
                    />
                    {clientType === "juridica" && 
                     errors.cnpj && isPessoaJuridica(watch()) && (
                      <p className="text-sm text-red-500">{(errors as any).cnpj?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsibleName">Nome do Responsável</Label>
                    <Input
                      id="responsibleName"
                      placeholder="Nome do responsável"
                      {...register("responsibleName")}
                    />
                    {clientType === "juridica" && 
                     errors.responsibleName && isPessoaJuridica(watch()) && (
                      <p className="text-sm text-red-500">{(errors as any).responsibleName?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-juridica">Email *</Label>
                    <Input
                      id="email-juridica"
                      type="email"
                      placeholder="email@exemplo.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-juridica">Telefone *</Label>
                    <Input
                      id="phone-juridica"
                      placeholder="(00) 00000-0000"
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address-juridica">Endereço</Label>
                    <Input
                      id="address-juridica"
                      placeholder="Endereço completo"
                      {...register("address")}
                    />
                    {errors.address && (
                      <p className="text-sm text-red-500">{errors.address.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="active-juridica">Status</Label>
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
                  
                  {/* Hidden input to ensure type is always set correctly */}
                  <input type="hidden" {...register("type")} value="juridica" />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/clients")}
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

export default EditClientPage;
