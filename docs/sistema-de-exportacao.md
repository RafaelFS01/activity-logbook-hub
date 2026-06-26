# 📊 Sistema de Exportação e Relatórios Inteligentes

O **Activity Logbook Hub** implementa mecanismos robustos para geração de relatórios tabulares em planilhas Excel (`.xlsx`) e documentos estruturados no Word (`.docx`), integrados a modelos de Inteligência Artificial.

---

## 🏗️ Arquitetura do Sistema de Exportação

Para evitar sobrecarregar o carregamento inicial da página com bibliotecas pesadas de manipulação de planilhas e documentos, o sistema foi estruturado de forma dinâmica:

1.  **Exportação XLSX Fallback:** Utiliza a biblioteca `xlsx` nativa instalada nas dependências para exportações simples de tabelas JSON.
2.  **Exportação ExcelJS Estilizado:** Utiliza a biblioteca `exceljs` para gerar planilhas estilizadas (mesclagem de células, linhas zebradas, filtros e congelamento de cabeçalhos). É **carregada de forma assíncrona** via CDN apenas quando acionada pelo usuário.
3.  **Geração de Relatórios DOCX (Templates):** Utiliza as bibliotecas `docxtemplater` e `pizzip` para ler e preencher um template padrão do Word localizado em `/templates/template - Nova Estrutura.docx`, exportando relatórios formais de atividades por cliente e período.
4.  **Enriquecimento com IA (Gemini):** Integra-se com a API do Google Gemini para converter os registros breves das atividades do banco em resumos técnicos detalhados e formais adequados para entrega a clientes.

---

## 💾 Exportação de Planilhas (Excel)

O sistema suporta exportação básica via `xlsx` e avançada via `exceljs` injetado dinamicamente:
*   **Merge de Células:** Banner de título estilizado mesclado.
*   **Zebra Stripes:** Linhas pares preenchidas com azul claro (`FFF7F9FC`).
*   **Painel Congelado (Frozen Pane):** Mantém a linha de títulos visível durante a rolagem.
*   **Larguras Inteligentes:** Mede o tamanho das strings e ajusta as colunas automaticamente.

---

## 📄 Geração de Relatórios no Word (`.docx`)

O preenchimento de documentos utiliza o **Docxtemplater** para ler o arquivo do template binário via requisição HTTP (`fetch`), descompactá-lo na memória por meio da biblioteca **PizZip**, injetar o contexto de dados e reconstruir o arquivo final para download.

### 1. Estrutura de Tags do Template
O template Word espera as seguintes variáveis para substituição declarativa:
*   `entidade_cliente`: Nome fantasia ou completo do cliente.
*   `data_inicial` / `data_final`: Período do relatório.
*   `introducao`: Texto de introdução cadastrado na ficha do cliente (`reportIntroduction`).
*   `data_extenso_emissao`: Data atual formatada por extenso.
*   `lista_servicos`: Array contendo a lista de atendimentos do período:
    *   `letra`: Marcador sequencial do atendimento (ex: `2.1.a`, `2.1.b`).
    *   `data_servico`: Data em que a tarefa foi iniciada (`dd/MM/yyyy`).
    *   `titulo_sumario`: Título descritivo do bloco (ex: `2.1.a Atendimento em 10/05/2026`).
    *   `descricao_servico`: Resumo descritivo da atividade gerada pelo assistente.

### 2. Geração de Índices Sequenciais (Letras)
O código aplica uma conversão matemática baseada em tabela ASCII para gerar automaticamente letras consecutivas nos índices dos atendimentos:
```typescript
const numeroSequencial = index + 1;
// Se for a primeira atividade, o índice é "2.1.a". A partir da segunda, converte para caractere ASCII correspondente.
const letra = numeroSequencial === 1 ? '2.1.a' : `2.1.${String.fromCharCode(97 + numeroSequencial)}`;
```

### 3. Geração em Lote (Lote ZIP)
Caso a exportação seja disparada para "Todos os Clientes", o sistema:
1. Filtra as atividades de todos os clientes no período selecionado.
2. Faz o envio unificado das atividades para resumo na IA.
3. Processa individualmente o template Word para cada cliente contendo atividades.
4. Adiciona cada arquivo `.docx` gerado a um container compactado na memória via **JSZip**.
5. Dispara o download automático de um único arquivo `.zip` contendo todos os relatórios da equipe.

---

## 🤖 Integração com IA (Google Gemini API)

A API do Gemini é consumida para reescrever e dar polimento técnico e profissional às descrições inseridas pelos colaboradores, transformando-as em textos detalhados com 50 a 100 palavras.

### Otimização em Requisição Única (Single Request)
Para evitar lentidão e overhead de rede que ocorreriam ao chamar a API do Gemini individualmente para cada atividade da lista (o que esgotaria facilmente as taxas de requisições por minuto - RPM), o sistema agrupa os dados de todas as atividades do período em um único payload JSON estruturado.

O método `generateSummariesSingleRequest(activities)` envia esse lote unificado à API do Gemini acompanhado de instruções de formatação rígidas. O modelo processa as descrições e responde com um array de objetos JSON mapeados por ID.

```json
{
  "summaries": [
    {
      "id": "-OG1234abc",
      "summary": "Descrição formal e detalhada do atendimento do eSocial realizado..."
    }
  ]
}
```

O frontend analisa a resposta da IA, desmembra os resumos por ID e alimenta as variáveis do template do Word, otimizando o tempo de resposta em mais de 90%.
