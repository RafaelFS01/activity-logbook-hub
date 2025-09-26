## Parar pulsação dos botões da Sidebar

### Objetivo
Remover quaisquer animações de pulsação aplicadas aos botões da sidebar, mantendo apenas efeitos sutis de hover/foco.

### Contexto
Classes utilitárias `animate-pulse` estavam sendo aplicadas ao link ativo e aos ícones dentro dos botões da sidebar em `src/components/layout/MainSidebar.tsx`.

### Tarefas
- [x] Remover `animate-pulse` do container do botão ativo na sidebar
- [x] Remover `before:animate-pulse` (barra lateral decorativa) do botão ativo
- [x] Remover ` [&>svg]:animate-pulse` dos ícones dos botões
- [ ] Revisar outros botões fora da sidebar para garantir ausência de pulsação involuntária

### Alterações Realizadas
- Arquivo: `src/components/layout/MainSidebar.tsx`
  - Removidas as classes: `animate-pulse`, `before:animate-pulse` e ` [&>svg]:animate-pulse` do conjunto de classes de estado ativo do `NavLink`.

### Validação
- Build sem erros de lint.
- Verificado visualmente: botões da sidebar não pulsam mais; hover/foco permanecem funcionais.

### Próximos Passos (opcional)
- Se necessário, avaliar se indicadores (ex.: componentes `activity-indicator` e `location-indicator`) devem manter pulsação, pois não são botões.


