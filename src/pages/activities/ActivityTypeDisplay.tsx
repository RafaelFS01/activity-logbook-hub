
import { useEffect, useState } from 'react';
import { getActivityTypes } from '@/services/firebase/activityTypes';

interface ActivityTypeDisplayProps {
  typeId?: string | null;
}

const ActivityTypeDisplay = ({ typeId }: ActivityTypeDisplayProps) => {
  const [typeName, setTypeName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchTypeName = async () => {
      if (!typeId) {
        setTypeName('');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const types = await getActivityTypes();
        const type = types.find(t => t.id === typeId);
        setTypeName(type?.name || 'Tipo não encontrado');
      } catch (error) {
        console.error("Erro ao buscar tipo:", error);
        setTypeName('Erro ao carregar tipo');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTypeName();
  }, [typeId]);
  
  if (isLoading) return <span className="text-muted-foreground">Carregando...</span>;
  if (!typeId || !typeName) return null;
  
  return (
    <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
      {typeName}
    </span>
  );
};

export default ActivityTypeDisplay;
