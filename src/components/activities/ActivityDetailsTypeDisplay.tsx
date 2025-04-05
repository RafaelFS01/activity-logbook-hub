
import { useEffect, useState } from 'react';
import { getActivityTypes } from '@/services/firebase/activityTypes';
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ActivityDetailsTypeDisplayProps {
  typeId?: string | null;
}

const ActivityDetailsTypeDisplay = ({ typeId }: ActivityDetailsTypeDisplayProps) => {
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
  
  if (isLoading) return <Badge variant="outline"><Loader2 className="h-3 w-3 animate-spin" /></Badge>;
  if (!typeId || !typeName) return <Badge variant="outline">Sem tipo</Badge>;
  
  return (
    <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
      {typeName}
    </Badge>
  );
};

export default ActivityDetailsTypeDisplay;
