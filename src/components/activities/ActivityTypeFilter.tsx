
import { useState, useEffect } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { getActivityTypes } from '@/services/firebase/activityTypes';
import { useToast } from '@/components/ui/use-toast';

interface ActivityTypeFilterProps {
  onTypeSelect: (typeId: string | null) => void;
  selectedTypeId?: string | null;
}

const ActivityTypeFilter = ({ onTypeSelect, selectedTypeId }: ActivityTypeFilterProps) => {
  const [activityTypes, setActivityTypes] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setIsLoading(true);
        const types = await getActivityTypes();
        setActivityTypes(types);
      } catch (error) {
        console.error("Erro ao buscar tipos de atividade:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os tipos de atividade."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTypes();
  }, [toast]);

  const typeOptions = activityTypes.map(type => ({
    value: type.id,
    label: type.name
  }));

  const handleSelectType = (value: string | null) => {
    onTypeSelect(value);
  };

  return (
    <div>
      <Combobox
        options={typeOptions}
        selectedValue={selectedTypeId || null}
        onSelect={handleSelectType}
        placeholder="Filtrar por tipo"
        searchPlaceholder="Buscar tipo..."
        noResultsText="Nenhum tipo encontrado"
        allowClear
        onClear={() => onTypeSelect(null)}
        triggerClassName="w-[200px]"
        disabled={isLoading}
      />
    </div>
  );
};

export default ActivityTypeFilter;
