## Dúvidas eSocial – Planejamento

### Objetivo
- Criar página de perguntas e respostas do eSocial com cadastro, edição, busca e paginação, mantendo o padrão visual atual.

### Escopo
- Incluir item na sidebar com ícone de interrogação, rota `/duvidas-esocial`.
- Exibir lista paginada de perguntas (10/20/50 por página) com expansão para resposta.
- Busca com debounce de 500 ms sobre texto das perguntas e tags.
- Cadastro e edição via modal amplo (pergunta, resposta, tags, ações salvar/cancelar).
- Combobox de tags multisseleção que lista existentes e permite criar nova digitada.

### Dados (Firebase Realtime Database)
- Nova entidade/nó `esocialQuestions`:
  - `id` (string), `question` (string), `answer` (string), `tags` (string[]), `createdAt` (timestamp), `updatedAt` (timestamp).
- Nova entidade/nó `esocialTags`:
  - `id` (string), `name` (string), `createdAt` (timestamp).
- Operações: listar, filtrar por termo/tag (client-side), criar, atualizar perguntas e tags.

### UI e componentes
- Reutilizar layout padrão da aplicação (AppLayout/MainSidebar) e componentes UI (button, input, textarea, combobox/command, dialog/modal, table ou lista com accordion).
- Modal de criação/edição grande (largura e altura similares aos usados em cadastros maiores).
- Botão “Criar pergunta” no canto superior direito; ação de editar em cada item da lista.
- Estado vazio e loaders alinhados ao padrão atual.

### Paginação e busca
- Paginação client-side com seletor 10/20/50.
- Debounce de 500 ms na busca.
- Filtro por termo em pergunta e por tags associadas.

### Checklist de entrega
- [x] Levantar componentes e padrões existentes.
- [x] Confirmar schema RTDB de perguntas e tags.
- [x] Implementar serviço RTDB de perguntas/tags.
- [x] Adicionar rota e item na sidebar.
- [x] Construir página com lista paginada e estados.
- [x] Implementar busca 500 ms por texto/tags.
- [x] Implementar combobox multi-select com criação.
- [x] Criar modais de criar/editar pergunta.
- [x] Atualizar documentação relacionada.
