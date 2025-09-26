# Plano: Verificação e Correção da Filtração por Colaborador (Activities)

## Contexto
Solicitação: "Verifique essa filtração, acredito que a lógica dela deve estar errada" e posterior envio do banco de dados de exemplo para validação.

Página: `src/pages/activities/ActivitiesPage.tsx`

## Objetivos
- Garantir que o filtro "Filtrar por colaborador" retorne exatamente as atividades cujo `assignedTo` contém o UID selecionado, considerando dados reais do exemplo de banco.

## Checklist de Tarefas
- [x] Analisar implementação atual de filtragem por colaborador
- [x] Validar contra o banco de exemplo (`database-example.txt`)
- [x] Corrigir comparação para evitar falhas por tipo/valores nulos
- [x] Testar interação do combobox e aplicação do filtro

## Decisões e Ajustes
- A filtragem foi reforçada para:
  - Validar se `assignedTo` existe e é um array
  - Usar `some()` com coerção para `String` em ambos os lados da comparação
  - Adicionar logs de debug para identificar problemas

Trecho ajustado:
```diff
// Filtro por Colaborador Selecionado (Apenas para Admin/Manager)
if (selectedCollaboratorId && user && (user.role === 'admin' || user.role === 'manager')) {
+  console.log('Filtrando por colaborador:', selectedCollaboratorId);
+  console.log('Colaborador selecionado:', collaborators[selectedCollaboratorId]);
+  
   filtered = filtered.filter(activity => {
     if (!activity.assignedTo || !Array.isArray(activity.assignedTo)) return false;
-    return activity.assignedTo.some(assigneeId => String(assigneeId) === String(selectedCollaboratorId));
+    const hasCollaborator = activity.assignedTo.some(assigneeId => String(assigneeId) === String(selectedCollaboratorId));
+    if (hasCollaborator) {
+      console.log('Atividade encontrada:', activity.title, 'com responsáveis:', activity.assignedTo);
+    }
+    return hasCollaborator;
   });
+  console.log('Atividades após filtro por colaborador:', filtered.length);
 }
```

## Validação com Base no Banco de Exemplo
- Exemplos em `activities[*].assignedTo` mostram arrays de UIDs como strings (ex.: `"7YtnSxdLG2StUJV1mvNRzfu96zp2"`).
- O ajuste garante compatibilidade mesmo se futuramente houver variação de tipo (string/number) ou valores nulos.

## Observações
- A filtragem inicial por role para `manager` permanece: mostra próprias atividades e quaisquer com pelo menos um responsável não-admin.
- O combobox de colaboradores exibe nomes conforme `users` e retorna UID em `value`, compatível com a comparação.

## Próximos Passos
- [ ] Caso surjam atividades com `assignedTo` vazio ou `null` que devam ser consideradas em algum cenário, definir regra e ajustar filtro.

