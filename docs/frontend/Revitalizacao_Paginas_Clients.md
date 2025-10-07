## Revitalização das Páginas de Clientes (/clients)

Objetivo: Reorganizar layout e revitalizar a estética das páginas de `Clients` para melhorar legibilidade, consistência visual e usabilidade, mantendo o comportamento atual.

### Escopo
- Página de listagem: `src/pages/clients/ClientsPage.tsx`
- Página de detalhes: `src/pages/clients/ClientDetailsPage.tsx`
- Página de novo cliente: `src/pages/clients/NewClientPage.tsx`
- Página de edição: `src/pages/clients/EditClientPage.tsx`

### Diretrizes de UI/UX
- Usar componentes de `src/components/ui` (cards, badges, avatar, select, empty-state, skeleton, etc.).
- Melhorar hierarquia visual (títulos, descrições, separadores, espaçamentos).
- Filtros responsivos com sticky em desktop e agrupamento limpo em mobile.
- Estados vazios claros e acionáveis.
- Paginação e ações consistentes.

### Checklist
- [x] ClientsPage: toolbar com busca, filtros e ordenação; cards com avatar; empty state padronizado; paginação refinada.
- [x] ClientDetailsPage: cabeçalho e ações, cartões de informações, tabs/títulos com espaçamento consistente.
- [x] NewClientPage: layout centrado, instruções curtas, espaçamentos e validações consistentes.
- [x] EditClientPage: layout e feedbacks alinhados ao NewClientPage.
- [ ] Revisão visual geral e testes manuais de responsividade.
- [x] Atualizar esta documentação com tarefas concluídas.

### Notas
- Não alterar regras de negócio nem chamadas de serviço.
- Evitar mudanças de estrutura de dados.

