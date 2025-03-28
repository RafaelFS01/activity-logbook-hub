import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { createClient, getClient, updateClient } from '@/lib/api/clients';
import { Client, ClientSchema, IndividualClientSchema, CompanyClientSchema } from '@/lib/schemas/client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from 'react-router-dom';
import { cn } from "@/lib/utils";

const NewClientPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [clientType, setClientType] = useState<"individual" | "company">("individual");

  const formSchema = clientType === "individual" ? IndividualClientSchema : CompanyClientSchema;

  const form = useForm<Client>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "individual",
      name: "",
      email: "",
      phone: "",
      address: "",
      ...(clientType === "company" ? { companyName: "", cnpj: "" } : {}),
      status: "active",
    },
    mode: "onChange",
  });

  const { data: clientData, isLoading: isClientLoading, isError: isClientError } = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClient(id!),
    enabled: isEditMode && !!id,
    onError: (error) => {
      toast.error(`Erro ao buscar cliente: ${error.message}`);
    }
  });

  React.useEffect(() => {
    if (clientData) {
      setClientType(clientData.type);
      form.reset(clientData);
    }
  }, [clientData, form]);

  const mutation = useMutation(
    isEditMode ? updateClient : createClient,
    {
      onSuccess: () => {
        toast.success(`Cliente ${isEditMode ? 'atualizado' : 'criado'} com sucesso!`);
        navigate('/clients');
      },
      onError: (error: any) => {
        toast.error(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} cliente: ${error.message}`);
      }
    }
  );

  const onSubmit = (data: Client) => {
    const payload = isEditMode ? { id, ...data } : data;
    mutation.mutate(payload);
  };

  const hasFieldError = (fieldName: string) => {
    return form.formState.errors[fieldName as keyof Client] !== undefined;
  };

  if (isClientLoading) return <div>Carregando...</div>;
  if (isClientError) return <div>Erro ao carregar cliente.</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">{isEditMode ? 'Editar Cliente' : 'Novo Cliente'}</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Cliente</FormLabel>
                <Select onValueChange={(value) => {
                  field.onChange(value);
                  setClientType(value === "company" ? "company" : "individual");
                  form.reset({
                    ...form.getValues(),
                    type: value,
                    ...(value === "company" ? { companyName: "", cnpj: "" } : {}),
                  });
                }} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="individual">Pessoa Física</SelectItem>
                    <SelectItem value="company">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {clientType === "individual" && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
                    </FormControl>
                    <FormMessage>{hasFieldError('name') ? form.formState.errors.name?.message : undefined}</FormMessage>
                  </FormItem>
                )}
              />
            </>
          )}

          {clientType === "company" && (
            <>
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} />
                    </FormControl>
                    <FormMessage>{hasFieldError('companyName') ? form.formState.errors.companyName?.message : undefined}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="CNPJ da empresa" {...field} />
                    </FormControl>
                    <FormMessage>{hasFieldError('cnpj') ? form.formState.errors.cnpj?.message : undefined}</FormMessage>
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Email do cliente" {...field} />
                </FormControl>
                <FormMessage>{hasFieldError('email') ? form.formState.errors.email?.message : undefined}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="Telefone do cliente" {...field} />
                </FormControl>
                <FormMessage>{hasFieldError('phone') ? form.formState.errors.phone?.message : undefined}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input placeholder="Endereço do cliente" {...field} />
                </FormControl>
                <FormMessage>{hasFieldError('address') ? form.formState.errors.address?.message : undefined}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default NewClientPage;
