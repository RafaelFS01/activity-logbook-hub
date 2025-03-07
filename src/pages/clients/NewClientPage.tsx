
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient, ClientType } from "@/services/firebase/clients";
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
import { ArrowLeft, Briefcase, Building2, User } from "lucide-react";

// Schema for pessoa física
const pessoaFisicaSchema = z.object({
  type: z.literal("fisica"),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  rg: z.string().optional(),
  address: z.string().optional(),
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
});

// Union of schemas with type discriminator
const clientSchema = z.discriminatedUnion("type", [
  pessoaFisicaSchema,
  pessoaJuridicaSchema,
]);

type PessoaFisicaFormValues = z.infer<typeof pessoaFisicaSchema>;
type PessoaJuridicaFormValues = z.infer<typeof pessoaJuridicaSchema>;
type ClientFormValues = PessoaFisicaFormValues | PessoaJuridicaFormValues;

const NewClientPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientType, setClientType] = useState<ClientType>("fisica");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: "fisica",
    } as PessoaFisicaFormValues,
  });

  // Type guard functions
  const isPessoaFisicaErrors = (
    clientType: ClientType
  ): clientType is "fisica" => {
    return clientType === "fisica";
  };

  const isPessoaJuridicaErrors = (
    clientType: ClientType
  ): clientType is "juridica" => {
    return clientType === "juridica";
  };

  // Update client type when tab changes
  const handleTabChange = (value: string) => {
    const newType = value as ClientType;
    setClientType(newType);
    
    // Reset the form with the new client type
    if (newType === "fisica") {
      reset({ 
        type: "fisica" 
      } as PessoaFisicaFormValues);
    } else {
      reset({ 
        type: "juridica" 
      } as PessoaJuridicaFormValues);
    }
  };

  const onSubmit = async (data: ClientFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar autenticado para realizar esta operação."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Make sure type is always set based on the active tab
      const clientData = {
        ...data,
        type: clientType, // Ensure type is always set correctly
        active: true,
        createdBy: user.uid
      };

      // Create client in Firebase
      await createClient(clientData, user.uid);

      toast({
        title: "Cliente criado com sucesso",
        description: `${data.name} foi adicionado à lista de clientes`
      });

      navigate("/clients");
    } catch (error: any) {
      console.error("Erro ao criar cliente:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar cliente",
        description: error.message || "Ocorreu um erro ao cadastrar o cliente."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <h1 className="text-3xl font-bold">Novo Cliente</h1>
        <p className="text-muted-foreground">
          Preencha o formulário para adicionar um novo cliente ao sistema.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Cadastro de Cliente
          </CardTitle>
          <CardDescription>
            Todos os campos com * são obrigatórios
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <Tabs
              defaultValue="fisica"
              onValueChange={handleTabChange}
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
                    {isPessoaFisicaErrors(clientType) && 
                      'cpf' in errors && (
                      <p className="text-sm text-red-500">{errors.cpf?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      placeholder="00.000.000-0"
                      {...register("rg")}
                    />
                    {isPessoaFisicaErrors(clientType) && 
                      'rg' in errors && (
                      <p className="text-sm text-red-500">{errors.rg?.message}</p>
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
                    {isPessoaJuridicaErrors(clientType) && 
                      'companyName' in errors && (
                      <p className="text-sm text-red-500">{errors.companyName?.message}</p>
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
                    {isPessoaJuridicaErrors(clientType) && 
                      'cnpj' in errors && (
                      <p className="text-sm text-red-500">{errors.cnpj?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsibleName">Nome do Responsável</Label>
                    <Input
                      id="responsibleName"
                      placeholder="Nome do responsável"
                      {...register("responsibleName")}
                    />
                    {isPessoaJuridicaErrors(clientType) && 
                      'responsibleName' in errors && (
                      <p className="text-sm text-red-500">{errors.responsibleName?.message}</p>
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
              {isSubmitting ? "Cadastrando..." : "Cadastrar Cliente"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default NewClientPage;
