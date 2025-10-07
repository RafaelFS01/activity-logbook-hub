# Planejamento Estratégico — Alinhamento das abas "Hoje" e "Este Mês" no gráfico

## Objetivo
Aplicar a mesma lógica da agenda da rota `/home` para as exibições "Hoje" e "Este Mês" do gráfico "Atividades ao Longo do Tempo" em `src/pages/Index.tsx`.

## Escopo
- Hoje: contabilizar atividades do dia como ativas por dia; apenas as que iniciam hoje e têm horário entram nos slots horários; demais caem em "Hoje (sem horário)".
- Este Mês: iterar dia a dia do mês e usar a mesma verificação de atividade ativa no dia (como na agenda) para cada dia.

## Tarefas
- [x] Criar documento de planejamento em `docs/dashboard/`
- [x] Ajustar lógica de distribuição em "Hoje" para evitar duplicações e respeitar início no dia
- [x] Confirmar uso de `isActivityActiveOnDate` para cada dia do mês
- [ ] Validar com dados reais do `database-example.txt`
- [ ] Atualizar este documento com resultados e marcar tarefas concluídas

## Arquivos afetados
- `src/pages/Index.tsx`

## Observações
- Conferir tooltips e legendas após alterações
- Manter consistência com `src/pages/Home.tsx`
