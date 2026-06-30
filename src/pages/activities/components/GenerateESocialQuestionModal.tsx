import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { createQuestion, createTagIfNotExists, getTags, ESocialTag } from "@/services/firebase/esocial-questions";
import { Activity } from "@/services/firebase/activities";
import { Check, Loader2, Plus, Sparkles, Tag, X, AlertCircle, Bold, Italic, Link, List } from "lucide-react";
import geminiService from "@/services/gemini-service";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FormattedText } from "@/components/ui/formatted-text";

interface GenerateESocialQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
}

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

export default function GenerateESocialQuestionModal({
  isOpen,
  onClose,
  activity
}: GenerateESocialQuestionModalProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<QuestionForm>(initialForm);
  const [tags, setTags] = useState<ESocialTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [tagSearch, setTagSearch] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (type: "bold" | "italic" | "link" | "list") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.answer;
    const selectedText = text.substring(start, end);

    let replacement = "";
    let cursorOffset = 0;
    let needsNewLine = false;

    switch (type) {
      case "bold":
        replacement = `**${selectedText || "texto"}**`;
        cursorOffset = selectedText ? replacement.length : 2;
        break;
      case "italic":
        replacement = `*${selectedText || "texto"}*`;
        cursorOffset = selectedText ? replacement.length : 1;
        break;
      case "link":
        replacement = `[${selectedText || "texto"}](url)`;
        cursorOffset = selectedText ? replacement.length : 1;
        break;
      case "list":
        needsNewLine = start > 0 && text.charAt(start - 1) !== "\n";
        replacement = `${needsNewLine ? "\n" : ""}- ${selectedText || "item"}`;
        cursorOffset = replacement.length;
        break;
    }

    const newAnswer = text.substring(0, start) + replacement + text.substring(end);
    setForm(prev => ({ ...prev, answer: newAnswer }));

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
      } else {
        if (type === "bold") {
          textarea.setSelectionRange(start + 2, start + 2 + 5);
        } else if (type === "italic") {
          textarea.setSelectionRange(start + 1, start + 1 + 5);
        } else if (type === "link") {
          textarea.setSelectionRange(start + 1, start + 1 + 5);
        } else if (type === "list") {
          textarea.setSelectionRange(start + (needsNewLine ? 3 : 2), start + (needsNewLine ? 3 : 2) + 4);
        }
      }
    }, 0);
  };

  // Carregar tags existentes do banco
  const loadTags = async () => {
    try {
      const loadedTags = await getTags();
      setTags(loadedTags);
    } catch (err) {
      console.error("Erro ao carregar tags do Firebase:", err);
    }
  };

  const generateQuestion = async () => {
    if (!activity) return;
    setIsLoading(true);
    setError(null);
    setForm(initialForm);

    try {
      // 1. Carregar tags existentes do sistema
      const dbTags = await getTags();
      setTags(dbTags);

      // 2. Chamar o serviço Gemini
      // Como o gemini-service é JS bruto, podemos ter problemas de tipagem ou exportação padrão,
      // por isso importamos e usamos diretamente como geminiService.
      const result = await (geminiService as any).generateESocialQuestion(activity, dbTags);
      
      if (result && result.question && result.answer) {
        setForm({
          question: result.question,
          answer: result.answer,
          tags: Array.isArray(result.tags) ? result.tags : []
        });
      } else {
        throw new Error("A IA retornou um formato inválido ou vazio.");
      }
    } catch (err: any) {
      console.error("Erro ao gerar dúvida com IA:", err);
      setError(err?.message || "Ocorreu um erro ao tentar comunicar com a API do Gemini. Verifique sua chave API ou conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  // Gerar dúvida assim que o modal for aberto com uma atividade válida
  useEffect(() => {
    if (isOpen && activity) {
      generateQuestion();
    } else {
      setForm(initialForm);
      setError(null);
    }
  }, [isOpen, activity]);

  const toggleTagSelection = (tagName: string) => {
    const normalized = tagName.trim();
    if (!normalized) return;
    setForm(prev => {
      const exists = prev.tags.some(tag => tag.toLowerCase() === normalized.toLowerCase());
      return {
        ...prev,
        tags: exists
          ? prev.tags.filter(tag => tag.toLowerCase() !== normalized.toLowerCase())
          : [...prev.tags, normalized]
      };
    });
  };

  const handleCreateTagFromSearch = async () => {
    if (!tagSearch.trim()) return;
    const newTagName = tagSearch.trim();
    
    // Evita duplicar na seleção local
    if (!form.tags.some(tag => tag.toLowerCase() === newTagName.toLowerCase())) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTagName]
      }));
    }
    setTagSearch("");
    setTagPopoverOpen(false);
  };

  const filteredTags = useMemo(() => {
    const term = tagSearch.trim().toLowerCase();
    if (!term) return tags;
    return tags.filter(tag => tag.name.toLowerCase().includes(term));
  }, [tagSearch, tags]);

  const handleSave = async () => {
    const trimmedQuestion = form.question.trim();
    const trimmedAnswer = form.answer.trim();

    if (!trimmedQuestion || !trimmedAnswer) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha a pergunta e a resposta."
      });
      return;
    }

    setIsSaving(true);
    try {
      const uniqueTags = Array.from(new Set(form.tags.map(tag => tag.trim()).filter(Boolean)));
      
      // Criar as tags que não existem no Firebase
      const ensuredTags = await Promise.all(uniqueTags.map(name => createTagIfNotExists(name)));
      const normalizedTagNames = ensuredTags.map(tag => tag.name);

      // Criar a pergunta no Firebase
      await createQuestion({
        question: trimmedQuestion,
        answer: trimmedAnswer,
        tags: normalizedTagNames
      });

      toast({
        title: "Dúvida cadastrada com sucesso!",
        description: "A pergunta e a resposta foram salvas no módulo do eSocial.",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              onClose();
              navigate("/duvidas-esocial");
            }}
          >
            Ver no eSocial
          </Button>
        )
      });

      onClose();
    } catch (err) {
      console.error("Erro ao salvar dúvida no Firebase:", err);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível cadastrar a pergunta no banco de dados."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg dark:bg-indigo-900/35">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Gerar Dúvida eSocial</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                Crie um registro de FAQ para a base do eSocial com base na atividade realizada
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4">
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin dark:text-indigo-400" />
              <Sparkles className="absolute h-4 w-4 text-indigo-400 animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Analisando a atividade...</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                A IA está relacionando as informações com a base conceitual e eventos padrão do eSocial.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-full dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">Falha na geração</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={generateQuestion} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="generated-question" className="text-sm font-semibold">Pergunta</Label>
              <Input
                id="generated-question"
                value={form.question}
                onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Exemplo: Como enviar o evento S-2200?"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Tabs defaultValue="write" className="w-full">
                <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                  <Label htmlFor="generated-answer" className="text-sm font-semibold">Resposta</Label>
                  <TabsList className="h-8 p-0.5 bg-slate-100 dark:bg-slate-800">
                    <TabsTrigger value="write" className="text-xs h-7 px-2.5">Escrever</TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs h-7 px-2.5">Visualizar</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="write" className="space-y-2 mt-0">
                  <div className="flex items-center gap-1 border rounded-md p-1 bg-slate-50 dark:bg-slate-900/50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => insertFormatting("bold")}
                      title="Negrito (**)"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => insertFormatting("italic")}
                      title="Itálico (*)"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => insertFormatting("link")}
                      title="Inserir Link [texto](url)"
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => insertFormatting("list")}
                      title="Lista (- item)"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    id="generated-answer"
                    ref={textareaRef}
                    rows={6}
                    value={form.answer}
                    onChange={(e) => setForm(prev => ({ ...prev, answer: e.target.value }))}
                    placeholder="Escreva as diretrizes teóricas ou passo-a-passo técnico."
                    className="w-full resize-none font-sans"
                  />
                </TabsContent>
                
                <TabsContent value="preview" className="mt-0">
                  <div className="border rounded-md p-3.5 bg-slate-50/50 dark:bg-slate-900/20 min-h-[224px] max-h-[300px] overflow-y-auto">
                    {form.answer ? (
                      <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                        <FormattedText text={form.answer} />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center py-12">
                        Nada para visualizar. Digite algo na aba "Escrever".
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tags do eSocial</Label>
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tagPopoverOpen}
                    className="w-full justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <span className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {form.tags.length > 0 ? `${form.tags.length} tag(s) selecionada(s)` : "Selecione ou crie tags para o evento"}
                    </span>
                    <span className="text-xs text-muted-foreground">Selecionar</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar ou criar tag (ex: S-1200 ou Férias)..."
                      value={tagSearch}
                      onValueChange={setTagSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {tagSearch ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
                            onClick={handleCreateTagFromSearch}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Criar tag "{tagSearch}"
                          </Button>
                        ) : (
                          "Nenhuma tag encontrada."
                        )}
                      </CommandEmpty>
                      <CommandGroup heading="Tags do Sistema">
                        <ScrollArea className="max-h-48">
                          {filteredTags.map(tag => (
                            <CommandItem
                              key={tag.id}
                              value={tag.name}
                              onSelect={() => toggleTagSelection(tag.name)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Check
                                className={`h-4 w-4 text-indigo-600 dark:text-indigo-400 ${
                                  form.tags.some(t => t.toLowerCase() === tag.name.toLowerCase()) 
                                    ? "opacity-100" 
                                    : "opacity-0"
                                }`}
                              />
                              <span className="flex-1">{tag.name}</span>
                            </CommandItem>
                          ))}
                          {tagSearch && !tags.some(t => t.name.toLowerCase() === tagSearch.trim().toLowerCase()) && (
                            <CommandItem
                              value={`new-${tagSearch}`}
                              onSelect={handleCreateTagFromSearch}
                              className="text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer"
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
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {form.tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="rounded-full pl-2.5 pr-1 py-0.5 text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        className="p-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
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
        )}

        <DialogFooter className="border-t pt-4 mt-2 gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading || isSaving}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          {!error && !isLoading && (
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Dúvida
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
