# Planejamento Estratégico — Correção da lógica "Essa Semana" no gráfico "Atividades ao Longo do Tempo"

## Objetivo
Alinhar a lógica da exibição semanal ("Essa Semana") do gráfico de barras em `src/pages/Index.tsx` com a lógica usada na agenda da rota `/home`, garantindo:
- Semana iniciando na segunda-feira (consistente com a agenda)
- Cálculo de atividades por dia usando a mesma verificação de atividade ativa no dia
- Ordenação correta dos dias no eixo X (Seg → Dom)

## Escopo
- Ajustar cálculo do intervalo semanal para usar `weekStartsOn: 1`
- Reutilizar/alinhar a função `isActivityActiveOnDate` com a da agenda
- Corrigir a ordenação dos dias no dataset do gráfico semanal
- Garantir que atividades sem `endDate` contem apenas no dia de início (como na agenda)

## Tarefas
- [x] Criar documento de planejamento em `docs/dashboard/`
- [x] Importar funções ausentes (`parseISO`, `isSameDay`) em `src/pages/Index.tsx`
- [x] Padronizar semana iniciando na segunda-feira (`weekStartsOn: 1`) no cálculo do período semanal
- [x] Corrigir ordenação dos dias no gráfico semanal (Seg → Dom)
- [ ] Validar com atividades sem `endDate` e multi-dia no banco de exemplo
- [ ] Atualizar este documento com o resultado dos testes e marcar tarefas concluídas

## Arquivos afetados
- `src/pages/Index.tsx`

## Observações
- Manter coesão com a lógica da agenda em `src/pages/Home.tsx`
- Conferir se há impacto em tooltips/legendas do Recharts
