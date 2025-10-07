import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  className?: string;
}

const ActivityPagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className
}: ActivityPaginationProps) => {
  // Não mostrar paginação se não houver páginas ou apenas uma página
  if (totalPages <= 1) {
    return null;
  }

  // Calcular informações sobre os itens exibidos
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Função para gerar array de números de página para exibição
  const getPageNumbers = () => {
    const delta = 2; // Número de páginas para mostrar de cada lado da página atual
    const range = [];
    const rangeWithDots = [];

    // Sempre mostrar primeira página
    range.push(1);

    // Calcular intervalo ao redor da página atual
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    // Adicionar pontos à esquerda se necessário
    if (start > 2) {
      rangeWithDots.push('...');
    }

    // Adicionar páginas do intervalo
    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    // Adicionar pontos à direita se necessário
    if (end < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Sempre mostrar última página (se não for a primeira)
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range.filter(page => page !== '...'); // Remover duplicatas dos pontos
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={cn("flex flex-col gap-4 mt-8", className)}>
      {/* Informações sobre os resultados */}
      <div className="text-sm text-muted-foreground text-center">
        <span className="hidden sm:inline">
          Mostrando {startItem}-{endItem} de {totalItems} atividades
        </span>
        <span className="sm:hidden">
          {startItem}-{endItem} de {totalItems}
        </span>
      </div>

      {/* Controles de paginação */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {/* Itens por página (opcional) */}
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2 order-2 sm:order-1">
            <span className="text-sm text-muted-foreground hidden sm:inline">Itens por página:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Controles de navegação */}
        <div className="flex items-center gap-1 order-1 sm:order-2">
          {/* Botão Primeira Página */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="Primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Botão Página Anterior */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Números das páginas - mostrar menos em mobile */}
          <div className="flex items-center gap-1">
            {pageNumbers.slice(0, window.innerWidth < 640 ? 3 : 5).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 min-w-8 px-2",
                  currentPage === page && "bg-primary text-primary-foreground"
                )}
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            ))}

            {/* Mostrar mais páginas se necessário */}
            {pageNumbers.length > 5 && window.innerWidth >= 640 && (
              <span className="px-2 text-sm text-muted-foreground">...</span>
            )}
          </div>

          {/* Botão Próxima Página */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Botão Última Página */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Informações da página atual (mobile) */}
        <div className="text-sm text-muted-foreground order-3 text-center">
          Página {currentPage} de {totalPages}
        </div>
      </div>
    </div>
  );
};

export default ActivityPagination;
