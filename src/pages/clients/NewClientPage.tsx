
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createClient } from "@/services/firebase/clients";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const clientSchema = z.object({
  type: z.enum(["fisica", "juridica"]),
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres." }).optional(),
  companyName: z.string().min(3, { message: "Nome da empresa deve ter pelo menos 3 caracteres." }).optional(),
  email: z.string().email({ message: "Email inválido." }),
  phone: z.string().min(8, { message: "Telefone deve ter pelo menos 8 caracteres." }),
  address: z.string().optional(),
  cpf: z.string().min(11, { message: "CPF deve ter 11 caracteres." }).optional(),
  cnpj: z.string().min(14, { message: "CNPJ deve ter 14 caracteres." }).optional(),
  responsibleName: z.string().min(3, { message: "Nome do responsável deve ter pelo menos 3 caracteres." }).optional(),
  rg: z.string().optional(),
  active: z.boolean().default(true),
});

type ClientSchemaType = z.infer<typeof clientSchema>;

const NewClientPage = () => {
  const navigate = useNavigate();
  const [clientType, setClientType] = useState<"fisica" | "juridica">("fisica");
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<ClientSchemaType>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: "fisica",
      name: "",
      email: "",
      phone: "",
      address: "",
      active: true,
      cpf: "",
      rg: "",
      cnpj: "",
      companyName: "",
      responsibleName: "",
    },
  });

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (data: ClientSchemaType) => {
    try {
      if (!user) {
        toast({
          title: "Erro ao criar cliente",
          description: "Você precisa estar logado para realizar esta ação.",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure required fields are set based on client type
      const clientData = {
        ...data,
        type: data.type || "fisica",
        createdBy: user.uid,
        // For person
        name: clientType === "fisica" ? (data.name || "Nome não informado") : undefined,
        // For company
        companyName: clientType === "juridica" ? (data.companyName || "Empresa não informada") : undefined,
      };
      
      await createClient(clientData, user.uid);
      toast({
        title: "Cliente criado com sucesso!",
      });
      navigate("/clients");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar cliente!",
        description: "Por favor, tente novamente.",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/clients")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Novo Cliente</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
          <CardDescription>Preencha os campos abaixo para criar um novo cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <RadioGroup defaultValue={clientType} onValueChange={value => setClientType(value as "fisica" | "juridica")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fisica" id="fisica" />
                      <Label htmlFor="fisica">Pessoa Física</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="juridica" id="juridica" />
                      <Label htmlFor="juridica">Pessoa Jurídica</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    disabled={isSubmitting}
                  />
                  {(errors as any).email && (
                    <p className="text-sm text-destructive">{(errors as any).email.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    disabled={isSubmitting}
                  />
                  {(errors as any).phone && (
                    <p className="text-sm text-destructive">{(errors as any).phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    {...register("address")}
                    disabled={isSubmitting}
                  />
                  {(errors as any).address && (
                    <p className="text-sm text-destructive">{(errors as any).address.message}</p>
                  )}
                </div>
              </div>

              {clientType === 'fisica' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      {...register("name")}
                      disabled={isSubmitting}
                    />
                    {(errors as any).name && (
                      <p className="text-sm text-destructive">{(errors as any).name.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        {...register("cpf")}
                        disabled={isSubmitting}
                      />
                      {(errors as any).cpf && (
                        <p className="text-sm text-destructive">{(errors as any).cpf.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rg">RG</Label>
                      <Input
                        id="rg"
                        {...register("rg")}
                        disabled={isSubmitting}
                      />
                      {(errors as any).rg && (
                        <p className="text-sm text-destructive">{(errors as any).rg.message}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {clientType === 'juridica' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      {...register("companyName")}
                      disabled={isSubmitting}
                    />
                    {(errors as any).companyName && (
                      <p className="text-sm text-destructive">{(errors as any).companyName.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        {...register("cnpj")}
                        disabled={isSubmitting}
                      />
                      {(errors as any).cnpj && (
                        <p className="text-sm text-destructive">{(errors as any).cnpj.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="responsibleName">Nome do Responsável</Label>
                      <Input
                        id="responsibleName"
                        {...register("responsibleName")}
                        disabled={isSubmitting}
                      />
                      {(errors as any).responsibleName && (
                        <p className="text-sm text-destructive">{(errors as any).responsibleName.message}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={() => navigate("/clients")}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar Cliente
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewClientPage;
