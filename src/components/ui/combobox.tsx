"use client"; // Necessário se estiver usando App Router e componentes de cliente

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils"; // Sua função de utilitário para classnames
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

// Interface para as opções do Combobox
export interface ComboboxOption {
    value: string; // O valor interno, único
    label: string; // O texto exibido para o usuário
}

// Props do componente Combobox
interface ComboboxProps {
    options: ComboboxOption[];
    selectedValue: string | null | undefined;
    onSelect: (value: string | null) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    noResultsText?: string;
    disabled?: boolean;
    id?: string;
    triggerClassName?: string; // Classes para o botão Trigger
    contentClassName?: string; // Classes para o PopoverContent
    allowClear?: boolean;
    onClear?: () => void; // Função específica para limpar (opcional, onSelect(null) é o fallback)
    className?: string; // <<< PROP ADICIONADA PARA O CONTAINER EXTERNO >>>
}

const Combobox = React.forwardRef<
    HTMLButtonElement, // Refere-se ao botão PopoverTrigger
    ComboboxProps
>(({
       options,
       selectedValue,
       onSelect,
       placeholder = "Selecione uma opção...",
       searchPlaceholder = "Buscar opção...",
       noResultsText = "Nenhuma opção encontrada.",
       disabled = false,
       id,
       triggerClassName,
       contentClassName,
       allowClear = false,
       onClear,
       className, // <<< RECEBENDO A PROP className >>>
   }, ref) => {
    const [open, setOpen] = React.useState(false);

    // Encontra o label da opção selecionada
    const selectedLabel = React.useMemo(() => {
        return options.find((option) => option.value === selectedValue)?.label;
    }, [options, selectedValue]);

    // Handler para seleção de item
    const handleSelect = (currentValue: string) => {
        // Desseleciona se clicar no item já selecionado, senão seleciona o novo
        const newValue = currentValue === selectedValue ? null : currentValue;
        onSelect(newValue);
        setOpen(false);
    };

    // Handler para o botão de limpar
    const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Impede que o clique no X feche/abra o popover
        if (onClear) {
            onClear(); // Usa a função específica se fornecida
        } else {
            onSelect(null); // Fallback: chama onSelect com null
        }
        // Não precisa mexer no `open` state aqui, pois o Popover já trata o fechamento
        // Se precisar garantir que feche: setOpen(false);
    };

    // ID único para associar aria-controls, caso id não seja fornecido
    const generatedId = React.useId();
    const listboxId = `combobox-list-${id || generatedId}`;

    return (
        // <<< APLICANDO A className RECEBIDA AO DIV EXTERNO >>>
        // Este div é o container principal do componente Combobox
        <div className={cn("relative flex items-center w-full", className)}>
            <Popover open={open} onOpenChange={setOpen} >
                <PopoverTrigger asChild>
                    <Button
                        ref={ref} // Encaminha a ref para o botão
                        id={id || `combobox-trigger-${generatedId}`} // Usa ID fornecido ou gerado
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={open ? listboxId : undefined}
                        className={cn(
                            // Estilos padrão do botão trigger
                            "w-full justify-between text-ellipsis overflow-hidden whitespace-nowrap",
                            // Estilo quando nada está selecionado (mostrando placeholder)
                            !selectedLabel && "text-muted-foreground",
                            // Adiciona classes específicas do trigger passadas via props
                            triggerClassName
                        )}
                        disabled={disabled}
                    >
                        {/* Span para garantir que o texto não empurre os ícones */}
                        <span className="flex-1 text-left text-ellipsis overflow-hidden whitespace-nowrap">
                       {selectedLabel || placeholder}
                      </span>
                        {/* Ícone de Abrir/Fechar */}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                {/* Botão de Limpar (Renderizado condicionalmente) */}
                {allowClear && selectedValue && !disabled && (
                    <Button
                        variant="ghost"
                        size="icon"
                        // Posicionamento absoluto à direita, antes do ícone ChevronsUpDown
                        className="absolute right-[calc(0.5rem+16px+0.5rem)] top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground z-10" // Ajuste right-[...] e adicione z-10
                        onClick={handleClear}
                        aria-label="Limpar seleção"
                        tabIndex={-1} // Evita que entre na ordem de tabulação normal
                    >
                        <X className="h-4 w-4"/>
                    </Button>
                )}

                <PopoverContent
                    className={cn(
                        // Faz o conteúdo ter a mesma largura do trigger
                        "w-[var(--radix-popover-trigger-width)] p-0",
                        // Adiciona classes específicas do conteúdo passadas via props
                        contentClassName
                    )}
                    style={{ zIndex: 50 }} // Garante sobreposição se necessário
                >
                    <Command>
                        <CommandInput
                            placeholder={searchPlaceholder}
                            disabled={disabled}
                            className="pl-2" // <<< ADICIONE ESTA CLASSE >>>
                        />
                        <CommandList id={listboxId}> {/* ID para aria-controls */}
                            <CommandEmpty>{noResultsText}</CommandEmpty>
                            {/* Garante scroll para listas longas */}
                            <ScrollArea className="max-h-[200px] overflow-y-auto">
                                <CommandGroup>
                                    {options.map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            value={option.label} // Usa o label para busca, mas mantém o value para seleção
                                            onSelect={() => handleSelect(option.value)} // Passa o value correto
                                            disabled={disabled}
                                            className="cursor-pointer" // Feedback visual
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    // Mostra o check se for o item selecionado
                                                    selectedValue === option.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {/* Exibe o label para o usuário */}
                                            {option.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
});
Combobox.displayName = "Combobox"; // Facilita a depuração no React DevTools

export { Combobox };