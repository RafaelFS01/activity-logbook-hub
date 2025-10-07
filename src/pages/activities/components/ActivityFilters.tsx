import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  XCircle,
  Clock,
  RotateCcw,
  CheckCircle2,
  Users,
  ListFilter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { UserData } from "@/services/firebase/auth";
import { ActivityStatus } from "@/services/firebase/activities";
import { Client } from "@/services/firebase/clients";
import { Combobox } from "@/components/ui/combobox";

interface ActivityFiltersProps {
  // Estados de filtro
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilters: ActivityStatus[];
  setStatusFilters: (filters: ActivityStatus[]) => void;
  dateType: "startDate" | "endDate";
  setDateType: (type: "startDate" | "endDate") => void;
  startPeriod: Date | undefined;
  setStartPeriod: (date: Date | undefined) => void;
  endPeriod: Date | undefined;
  setEndPeriod: (date: Date | undefined) => void;
  selectedCollaboratorId: string | null;
  setSelectedCollaboratorId: (id: string | null) => void;
  selectedActivityType: string | null;
  setSelectedActivityType: (type: string | null) => void;

  // Dados necessários
  collaborators: Record<string, UserData & { uid: string }>;
  activityTypes: string[];
  clients: Record<string, Client>;
  user: { uid: string; name: string; role: string; email: string } | null;
  isLoading: boolean;

  // Funções auxiliares
  resetFilters: () => void;
  onSearchChange: (value: string) => void;
}

const ActivityFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilters,
  setStatusFilters,
  dateType,
  setDateType,
  startPeriod,
  setStartPeriod,
  endPeriod,
  setEndPeriod,
  selectedCollaboratorId,
  setSelectedCollaboratorId,
  selectedActivityType,
  setSelectedActivityType,
  collaborators,
  activityTypes,
  clients,
  user,
  isLoading,
  resetFilters,
  onSearchChange
}: ActivityFiltersProps) => {
  const [inputValue, setInputValue] = useState(searchTerm);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Debounce para busca
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(inputValue);
      onSearchChange(inputValue);
    }, 500);

    return () => clearTimeout(handler);
  }, [inputValue, setSearchTerm, onSearchChange]);

  // Funções auxiliares
  const toggleStatusFilter = (status: ActivityStatus) => {
    setStatusFilters(
      statusFilters.includes(status)
        ? statusFilters.filter(s => s !== status)
        : [...statusFilters, status]
    );
  };

  const isStatusFilterActive = (status: ActivityStatus) => statusFilters.includes(status);

  // Opções para Combobox de Colaborador
  const collaboratorOptions = useMemo(() => {
    if (!collaborators || Object.keys(collaborators).length === 0) return [];
    return Object.values(collaborators)
      .map(collab => ({
        value: collab.uid,
        label: collab.name || `Usuário ${collab.uid.substring(0, 6)}...`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [collaborators]);

  // Opções para Combobox de Tipo de Atividade
  const activityTypeOptions = useMemo(() => {
    if (!activityTypes || activityTypes.length === 0) return [];
    return activityTypes.map(type => ({
      value: type,
      label: type
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [activityTypes]);

  // Verifica se há filtros ativos
  const hasActiveFilters = inputValue || statusFilters.length > 0 || startPeriod || endPeriod || selectedCollaboratorId || selectedActivityType;

  return (
    <div className="flex flex-col gap-4 mb-6 p-4 border rounded-lg bg-card shadow-sm">
      {/* Linha 1: Busca, Colaborador, Tipo, Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-4 items-end">
        {/* Input de Busca */}
        <div className="relative w-full sm:col-span-2 lg:col-span-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar atividades..."
            className="pl-8 w-full"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Combobox Colaborador (Condicional) */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="sm:col-span-2 lg:col-span-2">
            <Combobox
              id="collaborator-filter"
              options={collaboratorOptions}
              selectedValue={selectedCollaboratorId}
              onSelect={(value) => setSelectedCollaboratorId(value as string | null)}
              placeholder="Colaborador"
              searchPlaceholder="Buscar colaborador..."
              noResultsText="Nenhum colaborador encontrado."
              triggerClassName="w-full"
              contentClassName="w-[var(--radix-popover-trigger-width)]"
              allowClear={true}
              onClear={() => setSelectedCollaboratorId(null)}
              disabled={isLoading || collaboratorOptions.length === 0}
            />
          </div>
        )}

        {/* Combobox Tipo de Atividade */}
        <div className="sm:col-span-2 lg:col-span-2">
          <Combobox
            id="activity-type-filter"
            options={activityTypeOptions}
            selectedValue={selectedActivityType}
            onSelect={(value) => setSelectedActivityType(value as string | null)}
            placeholder="Tipo"
            searchPlaceholder="Buscar tipo..."
            noResultsText="Nenhum tipo encontrado."
            triggerClassName="w-full"
            contentClassName="w-[var(--radix-popover-trigger-width)]"
            allowClear={true}
            onClear={() => setSelectedActivityType(null)}
            disabled={isLoading || activityTypeOptions.length === 0}
          />
        </div>

        {/* Botão Filtro de Data (Popover) */}
        <div className="flex justify-center sm:justify-start sm:col-span-2 lg:col-span-1">
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-10 h-10 p-0 justify-center items-center"
                disabled={isLoading}
                title="Filtrar por período"
              >
                <Filter className="h-4 w-4" />
                {(startPeriod || endPeriod) && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <h3 className="font-medium text-center text-sm">Filtrar por Período</h3>

                {/* Seleção de Data (Início ou Fim) */}
                <div>
                  <Label className="mb-2 block text-xs font-medium text-center text-muted-foreground">
                    Aplicar filtro sobre:
                  </Label>
                  <RadioGroup
                    value={dateType}
                    onValueChange={(value) => setDateType(value as "startDate" | "endDate")}
                    className="flex justify-center gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="startDate" id="period-start-date" />
                      <Label htmlFor="period-start-date" className="font-normal cursor-pointer text-sm">
                        Data Início
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="endDate" id="period-end-date" />
                      <Label htmlFor="period-end-date" className="font-normal cursor-pointer text-sm">
                        Data Fim
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <hr className="my-3"/>

                {/* Seleção Data Inicial */}
                <div>
                  <Label htmlFor="start-date-picker-btn" className="mb-1 block text-sm">De:</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="start-date-picker-btn"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startPeriod && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startPeriod ? format(startPeriod, "dd/MM/yyyy") : <span>Selecione a data inicial</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={startPeriod}
                        onSelect={setStartPeriod}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Seleção Data Final */}
                <div>
                  <Label htmlFor="end-date-picker-btn" className="mb-1 block text-sm">Até:</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="end-date-picker-btn"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endPeriod && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endPeriod ? format(endPeriod, "dd/MM/yyyy") : <span>Selecione a data final</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={endPeriod}
                        onSelect={setEndPeriod}
                        initialFocus
                        disabled={startPeriod ? { before: startPeriod } : undefined}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Ações do Popover */}
                <div className="flex justify-between pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartPeriod(undefined);
                      setEndPeriod(undefined);
                    }}
                  >
                    Limpar Datas
                  </Button>
                  <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Linha 2: Filtros Rápidos de Status */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center border-t pt-4 mt-4">
        <span className="text-sm font-medium">Status:</span>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Botão 'Todas' */}
          <Button
            variant={statusFilters.length === 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setStatusFilters([])}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            Todas
          </Button>

          {/* Botões de Status individuais */}
          <Button
            variant={isStatusFilterActive("pending") ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleStatusFilter("pending")}
            className={`flex-1 sm:flex-none ${!isStatusFilterActive("pending") ? "border-yellow-300 text-yellow-800 hover:bg-yellow-50" : ""}`}
            disabled={isLoading}
          >
            <Clock className="h-4 w-4 mr-1" /> Futuras
          </Button>

          <Button
            variant={isStatusFilterActive("in-progress") ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleStatusFilter("in-progress")}
            className={`flex-1 sm:flex-none ${!isStatusFilterActive("in-progress") ? "border-blue-300 text-blue-800 hover:bg-blue-50" : ""}`}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-1" /> Em Progresso
          </Button>

          <Button
            variant={isStatusFilterActive("completed") ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleStatusFilter("completed")}
            className={`flex-1 sm:flex-none ${!isStatusFilterActive("completed") ? "border-green-300 text-green-800 hover:bg-green-50" : ""}`}
            disabled={isLoading}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Concluídas
          </Button>

          <Button
            variant={isStatusFilterActive("cancelled") ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleStatusFilter("cancelled")}
            className={`flex-1 sm:flex-none ${!isStatusFilterActive("cancelled") ? "border-red-300 text-red-800 hover:bg-red-50" : ""}`}
            disabled={isLoading}
          >
            <XCircle className="h-4 w-4 mr-1" /> Canceladas
          </Button>
        </div>
      </div>

      {/* Linha 3: Badges de Filtros Ativos e Botão Limpar */}
      {hasActiveFilters && !isLoading && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground border-t pt-3 mt-3">
          <span className="font-medium">Filtros ativos:</span>

          {/* Badge de Busca */}
          {inputValue && (
            <Badge variant="secondary" className="py-1">
              <Search className="h-3 w-3 mr-1"/> Busca: "{inputValue}"
            </Badge>
          )}

          {/* Badge de Colaborador */}
          {selectedCollaboratorId && collaborators[selectedCollaboratorId] && (
            <Badge variant="secondary" className="py-1">
              <Users className="h-3 w-3 mr-1" />
              Colab.: {collaborators[selectedCollaboratorId].name}
            </Badge>
          )}

          {/* Badge de Tipo */}
          {selectedActivityType && (
            <Badge variant="secondary" className="py-1">
              <ListFilter className="h-3 w-3 mr-1" /> Tipo: {selectedActivityType}
            </Badge>
          )}

          {/* Badge de Status */}
          {statusFilters.length > 0 && (
            <Badge variant="secondary" className="py-1">
              Status: {statusFilters.map(s => ({
                pending: 'Futura',
                'in-progress': 'Progresso',
                completed: 'Concluída',
                cancelled: 'Cancelada'
              }[s])).join(", ")}
            </Badge>
          )}

          {/* Badge de Data */}
          {(startPeriod || endPeriod) && (
            <Badge variant="secondary" className="py-1">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {dateType === "startDate" ? "Início" : "Fim"}:
              {startPeriod && ` de ${format(startPeriod, "dd/MM/yy")}`}
              {endPeriod && ` até ${format(endPeriod, "dd/MM/yy")}`}
            </Badge>
          )}

          {/* Botão Limpar Todos */}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 ml-auto"
            onClick={resetFilters}
          >
            <XCircle className="h-3 w-3 mr-1" /> Limpar todos
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivityFilters;
