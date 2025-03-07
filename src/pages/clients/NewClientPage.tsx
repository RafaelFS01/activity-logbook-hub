
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowLeft, Briefcase, Building2, User } from "lucide-react";

// Esquema para cliente pessoa física
const pessoaFisicaSchema = z.object({
  type: z.literal("fisica"),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  rg: z.string().optional(),
  address: z.string().optional(),
});

// Esquema para cliente pessoa jurídica
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

// União dos esquemas
const clientSchema = z.discriminatedUnion("type", [
  pessoaFisicaSchema,
  pessoaJuridicaSchema,
]);

type ClientFormValues = z.infer<typeof clientSchema>;

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
    watch,
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: "fisica",
    } as ClientFormValues,
  });

  // Atualizar tipo do cliente quando a tab mudar
  const handleTabChange = (value: string) => {
    setClientType(value as ClientType);
    setValue("type", value as ClientType);
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
      // Adicionando dados comuns
      const clientData = {
        ...data,
        active: true,
        createdBy: user.uid  // Add the missing createdBy property
      };

      // Criar cliente no Firebase
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
                    {clientType === "fisica" && errors.cpf && (
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
                    {clientType === "fisica" && errors.rg && (
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
                    {clientType === "fisica" && errors.address && (
                      <p className="text-sm text-red-500">{(errors as any).address?.message}</p>
                    )}
                  </div>
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
                    {clientType === "juridica" && (errors as any).companyName && (
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
                    {clientType === "juridica" && (errors as any).cnpj && (
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
                    {clientType === "juridica" && (errors as any).responsibleName && (
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
                    {clientType === "juridica" && (errors as any).address && (
                      <p className="text-sm text-red-500">{(errors as any).address?.message}</p>
                    )}
                  </div>
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
