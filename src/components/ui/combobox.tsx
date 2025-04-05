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
import { ScrollArea } from "@/components/ui/scroll-area"; // Importante para listas longas

// Interface para as opções do Combobox
export interface ComboboxOption {
    value: string; // O valor interno, único
    label: string; // O texto exibido para o usuário
}

// Props do componente Combobox
interface ComboboxProps {
    options: ComboboxOption[];
    selectedValue: string | null | undefined; // O valor da opção atualmente selecionada
    onSelect: (value: string | null) => void; // Função chamada quando uma opção é selecionada (ou limpa)
    placeholder?: string; // Placeholder para o botão quando nada está selecionado
    searchPlaceholder?: string; // Placeholder para a caixa de busca dentro do popover
    noResultsText?: string; // Texto exibido quando a busca não encontra resultados
    disabled?: boolean; // Para desabilitar o combobox
    id?: string; // ID para acessibilidade (associar com label externa)
    triggerClassName?: string; // Classes adicionais para o botão trigger
    contentClassName?: string; // Classes adicionais para o conteúdo do popover
    allowClear?: boolean; // Habilita um botão para limpar a seleção
    onClear?: () => void; // Função chamada quando o botão de limpar é clicado (necessário se allowClear=true)
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
   }, ref) => {
    const [open, setOpen] = React.useState(false);

    // Encontra o label da opção selecionada para exibir no botão
    const selectedLabel = React.useMemo(() => {
        return options.find((option) => option.value === selectedValue)?.label;
    }, [options, selectedValue]);

    // Handler para seleção de item
    const handleSelect = (currentValue: string) => {
        const newValue = currentValue === selectedValue ? null : currentValue;
        onSelect(newValue); // Chama a função do pai com o valor selecionado (ou null se desselecionado)
        setOpen(false); // Fecha o popover
    };

    // Handler para o botão de limpar
    const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Impede que o clique abra/feche o popover
        if (onClear) {
            onClear();
        } else {
            // Comportamento padrão se onClear não for fornecido mas allowClear for true
            onSelect(null);
        }
        setOpen(false); // Garante que o popover feche se estiver aberto
    };

    return (
        <div className="relative flex items-center w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        ref={ref}
                        id={id}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={open ? `combobox-list-${id || ''}` : undefined} // Associa ao conteúdo
                        className={cn(
                            "w-full justify-between text-ellipsis overflow-hidden whitespace-nowrap",
                            !selectedLabel && "text-muted-foreground", // Estilo quando placeholder é mostrado
                            triggerClassName
                        )}
                        disabled={disabled}
                    >
            <span className="flex-1 text-left text-ellipsis overflow-hidden whitespace-nowrap">
             {selectedLabel || placeholder}
            </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                {/* Botão de Limpar (Opcional) */}
                {allowClear && selectedValue && !disabled && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-10 h-6 w-6 p-0 text-muted-foreground hover:text-foreground" // Posicionado antes do ícone ChevronsUpDown
                        onClick={handleClear}
                        aria-label="Limpar seleção"
                    >
                        <X className="h-4 w-4"/>
                    </Button>
                )}
                <PopoverContent
                    className={cn("w-[var(--radix-popover-trigger-width)] p-0", contentClassName)} // Faz o popover ter a largura do botão
                    style={{ zIndex: 50 }} // Garante que fique acima de outros elementos se necessário
                >
                    <Command
                        // Adiciona um filtro customizado se necessário, por padrão filtra pelo texto
                        // filter={(value, search) => ...}
                    >
                        <CommandInput placeholder={searchPlaceholder} disabled={disabled} />
                        <CommandList id={`combobox-list-${id || ''}`}> {/* ID para aria-controls */}
                            <CommandEmpty>{noResultsText}</CommandEmpty>
                            {/* Usar ScrollArea para listas potencialmente longas */}
                            <ScrollArea className="max-h-[200px] overflow-y-auto">
                                <CommandGroup>
                                    {options.map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            value={option.value} // Importante: usa o 'value' para identificação interna e seleção
                                            onSelect={handleSelect}
                                            disabled={disabled}
                                            className="cursor-pointer"
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedValue === option.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
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
Combobox.displayName = "Combobox"; // Ajuda na depuração

export { Combobox };