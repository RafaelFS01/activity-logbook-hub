
import { useState } from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { createActivityType } from "@/services/firebase/activityTypes";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres."
  })
});

interface ActivityTypeModalProps {
  onTypeCreated: (typeId: string, typeName: string) => void;
}

const ActivityTypeModal = ({ onTypeCreated }: ActivityTypeModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: ""
    }
  });
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      const newType = await createActivityType(data.name);
      
      toast({
        title: "Tipo de atividade criado",
        description: "O novo tipo de atividade foi adicionado com sucesso."
      });
      
      // Passa o ID e nome do novo tipo para o componente pai
      onTypeCreated(newType.id, newType.name);
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao criar tipo de atividade:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o tipo de atividade."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" type="button">
          <PlusCircle className="h-4 w-4" />
          <span className="sr-only">Adicionar novo tipo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Tipo de Atividade</DialogTitle>
          <DialogDescription>
            Adicione um novo tipo de atividade para categorizar suas tarefas.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Tipo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reunião, Desenvolvimento, Entrega..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    Criando...
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  </>
                ) : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityTypeModal;
