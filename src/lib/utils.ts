
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma data em string para exibição
 * @param dateString String de data para formatar
 * @param format Formato de exibição
 * @returns Data formatada
 */
export function formatDate(dateString: string, format: "short" | "long" = "short"): string {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    
    if (format === "short") {
      return date.toLocaleDateString("pt-BR");
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return dateString;
  }
}
