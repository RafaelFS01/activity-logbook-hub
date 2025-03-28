
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/services/firebase/clients";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowLeft, User, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Definição dos schemas de validação
const pessoaFisicaSchema = z.object({
  type: z.literal("fisica"),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z
    .string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF deve ter no máximo 14 caracteres"),
  rg: z.string().optional(),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  address: z.string().optional(),
});

const pessoaJuridicaSchema = z.object({
  type: z.literal("juridica"),
  companyName: z.string().min(3, "Nome da empresa deve ter pelo menos 3 caracteres"),
  cnpj: z
    .string()
    .min(14, "CNPJ deve ter 14 dígitos")
    .max(18, "CNPJ deve ter no máximo 18 caracteres"),
  responsibleName: z.string().min(3, "Nome do responsável deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  address: z.string().optional(),
});

// Criação do schema de cliente combinado
const clientSchema = z.discriminatedUnion("type", [
  pessoaFisicaSchema,
  pessoaJuridicaSchema,
]);

type ClientFormValues = z.infer<typeof clientSchema>;

const NewClientPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientType, setClientType] = useState<"fisica" | "juridica">("fisica");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ClientFormValues>({
    resolver: zodResolver(
      clientType === "fisica" ? pessoaFisicaSchema : pessoaJuridicaSchema
    ),
    defaultValues: {
      type: "fisica",
      email: "",
      phone: "",
    } as ClientFormValues,
  });

  const onTabChange = (value: string) => {
    setClientType(value as "fisica" | "juridica");
    setValue("type", value as "fisica" | "juridica");
  };

  const onSubmit = async (data: ClientFormValues) => {
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
      // Preparando o objeto cliente com os campos necessários
      const clientData = {
        ...data,
        name: data.type === "fisica" ? data.name : "",
        companyName: data.type === "juridica" ? data.companyName : "",
        active: true,
        createdBy: user.uid,
        // Garantindo que o email é definido (não é opcional)
        email: data.email,
      };

      // Criar cliente no Firebase
      await createClient(clientData);

      toast({
        title: "Cliente cadastrado com sucesso",
        description: `O cliente foi adicionado ao sistema.`,
      });

      navigate("/clients");
    } catch (error: any) {
      console.error("Erro ao cadastrar cliente:", error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar cliente",
        description:
          error.message || "Ocorreu um erro ao cadastrar o cliente.",
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
          Preencha o formulário para cadastrar um novo cliente no sistema.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Cadastro de Cliente</CardTitle>
          <CardDescription>
            Selecione o tipo de cliente e preencha os dados
          </CardDescription>
        </CardHeader>

        <Tabs
          defaultValue="fisica"
          onValueChange={onTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fisica" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Pessoa Física
            </TabsTrigger>
            <TabsTrigger value="juridica" className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              Pessoa Jurídica
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)}>
            <TabsContent value="fisica">
              <CardContent className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    placeholder="Digite o nome completo"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      {...register("cpf")}
                    />
                    {errors.cpf && (
                      <p className="text-sm text-red-500">
                        {errors.cpf.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rg">RG (Opcional)</Label>
                    <Input
                      id="rg"
                      placeholder="00.000.000-0"
                      {...register("rg")}
                    />
                    {errors.rg && (
                      <p className="text-sm text-red-500">{errors.rg.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço (Opcional)</Label>
                  <Textarea
                    id="address"
                    placeholder="Digite o endereço completo"
                    {...register("address")}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-500">
                      {errors.address.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="juridica">
              <CardContent className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    placeholder="Digite o nome da empresa"
                    {...register("companyName")}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-red-500">
                      {errors.companyName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    {...register("cnpj")}
                  />
                  {errors.cnpj && (
                    <p className="text-sm text-red-500">
                      {errors.cnpj.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibleName">Nome do Responsável</Label>
                  <Input
                    id="responsibleName"
                    placeholder="Digite o nome do responsável"
                    {...register("responsibleName")}
                  />
                  {errors.responsibleName && (
                    <p className="text-sm text-red-500">
                      {errors.responsibleName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço (Opcional)</Label>
                  <Textarea
                    id="address"
                    placeholder="Digite o endereço completo"
                    {...register("address")}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-500">
                      {errors.address.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </TabsContent>

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
        </Tabs>
      </Card>
    </div>
  );
};

export default NewClientPage;
