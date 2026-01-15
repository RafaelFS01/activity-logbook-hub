import { db } from '@/lib/firebase';
import { get, push, ref, set, update, remove } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

export interface ESocialQuestion {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ESocialTag {
  id: string;
  name: string;
  createdAt: string;
}

const questionsRef = ref(db, 'esocialQuestions');
const tagsRef = ref(db, 'esocialTags');

const nowIso = () => new Date().toISOString();

const normalizeTagName = (name: string) => name.trim();

export const getQuestions = async (): Promise<ESocialQuestion[]> => {
  const snapshot = await get(questionsRef);
  if (!snapshot.exists()) return [];
  const value = snapshot.val() as Record<string, ESocialQuestion>;
  return Object.values(value).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const getTags = async (): Promise<ESocialTag[]> => {
  const snapshot = await get(tagsRef);
  if (!snapshot.exists()) return [];
  const value = snapshot.val() as Record<string, ESocialTag>;
  return Object.values(value).sort((a, b) => a.name.localeCompare(b.name));
};

export const createTagIfNotExists = async (name: string): Promise<ESocialTag> => {
  const normalized = normalizeTagName(name);
  if (!normalized) {
    throw new Error('Nome da tag é obrigatório');
  }

  const current = await getTags();
  const existing = current.find(
    tag => tag.name.toLowerCase() === normalized.toLowerCase()
  );
  if (existing) return existing;

  const newRef = push(tagsRef);
  const id = newRef.key || uuidv4();
  const tagData: ESocialTag = {
    id,
    name: normalized,
    createdAt: nowIso()
  };
  await set(newRef, tagData);
  return tagData;
};

export const createQuestion = async (
  data: Omit<ESocialQuestion, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ESocialQuestion> => {
  const newRef = push(questionsRef);
  const id = newRef.key || uuidv4();

  const payload: ESocialQuestion = {
    id,
    question: data.question.trim(),
    answer: data.answer.trim(),
    tags: data.tags.map(normalizeTagName).filter(Boolean),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  await set(newRef, payload);
  return payload;
};

export const updateQuestion = async (
  id: string,
  data: Partial<Omit<ESocialQuestion, 'id' | 'createdAt'>>
): Promise<void> => {
  const questionRef = ref(db, `esocialQuestions/${id}`);

  const updated: Partial<ESocialQuestion> = {
    ...data,
    question: data.question?.trim() ?? undefined,
    answer: data.answer?.trim() ?? undefined,
    tags: data.tags?.map(normalizeTagName).filter(Boolean),
    updatedAt: nowIso()
  };

  await update(questionRef, updated);
};

export const deleteTag = async (tagId: string): Promise<void> => {
  // Encontra a tag pelo id
  const tags = await getTags();
  const tag = tags.find(t => t.id === tagId);
  if (!tag) return;

  // Remove a tag no nó principal
  await remove(ref(db, `esocialTags/${tagId}`));

  // Remove a tag de todas as perguntas que a contenham
  const snapshot = await get(questionsRef);
  if (!snapshot.exists()) return;

  const value = snapshot.val() as Record<string, ESocialQuestion>;
  const updates = Object.entries(value)
    .filter(([, question]) => question.tags?.includes(tag.name))
    .map(([questionId, question]) => {
      const filteredTags = question.tags.filter(t => t !== tag.name);
      return update(ref(db, `esocialQuestions/${questionId}`), {
        tags: filteredTags,
        updatedAt: nowIso()
      });
    });

  if (updates.length > 0) {
    await Promise.all(updates);
  }
};
