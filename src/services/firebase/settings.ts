import { db } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";

export interface GeminiSettings {
  apiKey: string;
  model: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const getGeminiSettings = async (): Promise<GeminiSettings | null> => {
  try {
    const snapshot = await get(ref(db, "settings/gemini"));
    if (!snapshot.exists()) return null;
    return snapshot.val() as GeminiSettings;
  } catch (error) {
    console.error("Erro ao obter configurações do Gemini:", error);
    throw error;
  }
};

export const saveGeminiSettings = async (
  settings: Omit<GeminiSettings, "updatedAt">,
  userId: string
): Promise<void> => {
  try {
    const payload: GeminiSettings = {
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };
    await set(ref(db, "settings/gemini"), payload);
  } catch (error) {
    console.error("Erro ao salvar configurações do Gemini:", error);
    throw error;
  }
};
