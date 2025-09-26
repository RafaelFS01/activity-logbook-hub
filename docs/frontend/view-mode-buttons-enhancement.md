# Melhorias nos Botões de Visualização (Dia/Semana/Mês)

## Objetivo
Implementar melhorias visuais nos botões de modo de visualização da página Home para fornecer melhor feedback visual ao usuário quando ele está visualizando diferentes períodos.

## Análise Atual
- Os botões já possuem lógica básica de estado ativo usando `variant='secondary'` para o botão selecionado
- O botão "Dia" aparece com background color quando ativo
- Os botões "Semana" e "Mês" aparecem transparentes quando não selecionados
- Falta efeito hover mais pronunciado para dar feedback visual

## Tarefas a Implementar

### 1. Melhorar Estilo do Botão Ativo
- [ ] Adicionar cores mais vibrantes para o botão ativo
- [ ] Implementar borda ou sombra para destacar o botão selecionado
- [ ] Garantir contraste adequado para acessibilidade

### 2. Implementar Efeitos Hover
- [ ] Adicionar hover sutil para botões não selecionados
- [ ] Implementar hover mais pronunciado para o botão ativo
- [ ] Usar transições suaves para as mudanças de estado

### 3. Melhorar Responsividade
- [ ] Garantir que os efeitos funcionem bem em dispositivos móveis
- [ ] Manter consistência visual em diferentes tamanhos de tela

## Implementação Técnica
- Modificar os estilos dos botões nas linhas 682-684 do arquivo Home.tsx
- Utilizar classes Tailwind CSS para os efeitos visuais
- Manter a lógica existente de estado ativo (`viewMode`)
- Adicionar função `cn()` para combinar classes dinamicamente

## Mudanças Implementadas
✅ **Botão Ativo**: Adicionado destaque visual com:
- Background primário com `bg-primary text-primary-foreground`
- Sombra sutil com `shadow-md`
- Borda colorida com `border-2 border-primary/20`
- Hover aprimorado com `hover:bg-primary/90 hover:shadow-lg`

✅ **Botões Não Ativos**: Adicionado hover sutil com:
- Background accent com `hover:bg-accent/80`
- Cor do texto accent com `hover:text-accent-foreground`
- Borda sutil com `hover:border-accent/50`

✅ **Transições**: Implementado `transition-all duration-200` para suavidade

## Critérios de Aceitação
- [x] Botão ativo deve ter destaque visual claro
- [x] Efeitos hover devem ser suaves e responsivos
- [x] Deve funcionar em todos os modos de visualização (day/week/month)
- [x] Manter acessibilidade e usabilidade
- [x] Sem erros de linting

## Arquivos Afetados
- `src/pages/Home.tsx` (linhas 682-684)
