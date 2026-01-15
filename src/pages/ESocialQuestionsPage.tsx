import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/ui/empty-state";
import { toast } from "@/components/ui/use-toast";
import { ESocialQuestion, ESocialTag, createQuestion, createTagIfNotExists, deleteTag, getQuestions, getTags, updateQuestion } from "@/services/firebase/esocial-questions";
import { Check, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Tag, Trash2, X } from "lucide-react";

const PAGE_SIZES = [10, 20, 50];

type QuestionForm = {
  question: string;
  answer: string;
  tags: string[];
};

const initialForm: QuestionForm = {
  question: "",
  answer: "",
  tags: []
};

const ESocialQuestionsPage = () => {
  const [questions, setQuestions] = useState<ESocialQuestion[]>([]);
  const [tags, setTags] = useState<ESocialTag[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ESocialQuestion | null>(null);
  const [form, setForm] = useState<QuestionForm>(initialForm);
  const [tagSearch, setTagSearch] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [loadedQuestions, loadedTags] = await Promise.all([
          getQuestions(),
          getTags()
        ]);
        setQuestions(loadedQuestions);
        setTags(loadedTags);
      } catch (error) {
        console.error("Erro ao carregar dúvidas do eSocial", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível buscar perguntas ou tags."
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const filteredQuestions = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return questions;

    return questions.filter(question => {
      const inQuestion = question.question.toLowerCase().includes(term);
      const inTags = question.tags.some(tag => tag.toLowerCase().includes(term));
      return inQuestion || inTags;
    });
  }, [questions, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredQuestions.slice(start, end);
  }, [filteredQuestions, currentPage, pageSize]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingQuestion(null);
    setTagSearch("");
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (question: ESocialQuestion) => {
    setForm({
      question: question.question,
      answer: question.answer,
      tags: question.tags
    });
    setEditingQuestion(question);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const trimmedQuestion = form.question.trim();
    const trimmedAnswer = form.answer.trim();

    if (!trimmedQuestion || !trimmedAnswer) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha pergunta e resposta."
      });
      return;
    }

    setIsSaving(true);
    try {
      const uniqueTags = Array.from(new Set(form.tags.map(tag => tag.trim()).filter(Boolean)));
      const ensuredTags = await Promise.all(uniqueTags.map(name => createTagIfNotExists(name)));
      const normalizedTagNames = ensuredTags.map(tag => tag.name);
      setTags(prev => {
        const merged = [...prev];
        ensuredTags.forEach(tag => {
          if (!merged.some(existing => existing.id === tag.id)) {
            merged.push(tag);
          }
        });
        return merged.sort((a, b) => a.name.localeCompare(b.name));
      });

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, {
          question: trimmedQuestion,
          answer: trimmedAnswer,
          tags: normalizedTagNames
        });

        setQuestions(prev =>
          prev.map(item =>
            item.id === editingQuestion.id
              ? { ...item, question: trimmedQuestion, answer: trimmedAnswer, tags: normalizedTagNames, updatedAt: new Date().toISOString() }
              : item
          )
        );
        toast({ title: "Pergunta atualizada" });
      } else {
        const created = await createQuestion({
          question: trimmedQuestion,
          answer: trimmedAnswer,
          tags: normalizedTagNames
        });
        setQuestions(prev => [created, ...prev]);
        toast({ title: "Pergunta criada" });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar pergunta", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Revise os campos e tente novamente."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTagSelection = (tagName: string) => {
    const normalized = tagName.trim();
    if (!normalized) return;
    setForm(prev => {
      const exists = prev.tags.includes(normalized);
      return {
        ...prev,
        tags: exists
          ? prev.tags.filter(tag => tag !== normalized)
          : [...prev.tags, normalized]
      };
    });
  };

  const handleCreateTagFromSearch = async () => {
    if (!tagSearch.trim()) return;
    try {
      const tag = await createTagIfNotExists(tagSearch);
      setTags(prev => {
        const merged = prev.some(t => t.id === tag.id) ? prev : [...prev, tag];
        return merged.sort((a, b) => a.name.localeCompare(b.name));
      });
      toggleTagSelection(tag.name);
      setTagSearch("");
    } catch (error) {
      console.error("Erro ao criar tag", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar tag",
        description: "Não foi possível criar a nova tag."
      });
    }
  };

  const filteredTags = useMemo(() => {
    const term = tagSearch.trim().toLowerCase();
    if (!term) return tags;
    return tags.filter(tag => tag.name.toLowerCase().includes(term));
  }, [tagSearch, tags]);

  const handleDeleteTag = async (tagId: string) => {
    if (deletingTagId) return;
    const targetTag = tags.find(t => t.id === tagId);
    if (!targetTag) return;
    setDeletingTagId(tagId);
    try {
      await deleteTag(tagId);
      setTags(prev => prev.filter(t => t.id !== tagId));
      setQuestions(prev =>
        prev.map(q => (q.tags?.includes(targetTag.name)
          ? { ...q, tags: q.tags.filter(t => t !== targetTag.name) }
          : q))
      );
      setForm(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== targetTag.name)
      }));
      toast({ title: "Tag excluída", description: `A tag "${targetTag.name}" foi removida.` });
    } catch (error) {
      console.error("Erro ao excluir tag", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir tag",
        description: "Não foi possível excluir a tag."
      });
    } finally {
      setDeletingTagId(null);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dúvidas eSocial</h1>
          <p className="text-muted-foreground">
            Perguntas frequentes sobre a rotina do eSocial. Busque, pagine e gerencie dúvidas.
          </p>
        </div>
        <Button onClick={openCreateModal} className="self-start md:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Criar pergunta
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="py-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pergunta ou tag..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Itens por página</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map(size => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredQuestions.length} pergunta(s) encontrada(s)</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              <span>Página {currentPage} de {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
              >
                Próxima
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : paginatedQuestions.length > 0 ? (
        <Accordion type="multiple" className="space-y-3">
          {paginatedQuestions.map(question => (
            <AccordionItem key={question.id} value={question.id} className="border rounded-lg px-4">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-start gap-3 w-full">
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{question.question}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {question.tags.length > 0 ? (
                        question.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="rounded-full">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem tags</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(question);
                    }}
                    title="Editar pergunta"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {question.answer}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <EmptyState
          title="Nenhuma pergunta encontrada"
          description="Cadastre uma nova pergunta ou ajuste sua busca."
          action={{
            label: "Criar pergunta",
            onClick: openCreateModal
          }}
          className="mt-6"
        />
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Editar pergunta" : "Nova pergunta"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="question">Pergunta</Label>
              <Input
                id="question"
                value={form.question}
                onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Descreva a dúvida"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Resposta</Label>
              <Textarea
                id="answer"
                rows={6}
                value={form.answer}
                onChange={(e) => setForm(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="Detalhe a resposta para a dúvida"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tagPopoverOpen}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {form.tags.length > 0 ? `${form.tags.length} tag(s) selecionada(s)` : "Selecione ou crie tags"}
                    </span>
                    <span className="text-xs text-muted-foreground">Abrir</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar ou criar tag..."
                      value={tagSearch}
                      onValueChange={setTagSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {tagSearch ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={handleCreateTagFromSearch}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Criar tag "{tagSearch}"
                          </Button>
                        ) : (
                          "Nenhuma tag encontrada."
                        )}
                      </CommandEmpty>
                      <CommandGroup heading="Tags existentes">
                        <ScrollArea className="max-h-48">
                          {filteredTags.map(tag => (
                            <CommandItem
                              key={tag.id}
                              value={tag.name}
                              onSelect={() => toggleTagSelection(tag.name)}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <Check
                                  className={`h-4 w-4 ${form.tags.includes(tag.name) ? "opacity-100" : "opacity-0"}`}
                                />
                                {tag.name}
                              </div>
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-600 disabled:opacity-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteTag(tag.id);
                                }}
                                disabled={deletingTagId === tag.id}
                                title="Excluir tag"
                              >
                                {deletingTagId === tag.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </CommandItem>
                          ))}
                          {tagSearch && !tags.some(t => t.name.toLowerCase() === tagSearch.trim().toLowerCase()) && (
                            <CommandItem
                              value={`new-${tagSearch}`}
                              onSelect={handleCreateTagFromSearch}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Criar tag "{tagSearch}"
                            </CommandItem>
                          )}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {form.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="rounded-full">
                      <span>{tag}</span>
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleTagSelection(tag)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingQuestion ? "Salvar alterações" : "Criar pergunta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ESocialQuestionsPage;
