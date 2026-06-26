# 📚 Documentação Técnica - Activity Logbook Hub

Bem-vindo à documentação técnica do **Activity Logbook Hub**. Este espaço contém as informações sobre a arquitetura do sistema, padrões de código, modelagem de banco de dados, fluxo de dados, interfaces e boas práticas adotadas no desenvolvimento do projeto.

Para facilitar a leitura e manter o contexto modular, a documentação está dividida nas seguintes seções:

## 🗂️ Seções Técnicas

1. **[Arquitetura e Design System](file:///c:/Users/rafaf/Cursor/activity-logbook-hub/docs/arquitetura-e-design.md)**
   * Stack tecnológica detalhada, Compound Component Pattern, Provider Pattern e Repository Pattern.
2. **[Modelagem do Banco de Dados](file:///c:/Users/rafaf/Cursor/activity-logbook-hub/docs/banco-de-dados.md)**
   * Estrutura de nós JSON do Firebase Realtime Database, regras e relacionamentos (diagrama de entidades em Mermaid).
3. **[Camada de Serviços Firebase](file:///c:/Users/rafaf/Cursor/activity-logbook-hub/docs/servicos-firebase.md)**
   * Tipagem TypeScript e métodos de CRUD (atividades, clientes, autenticação).
4. **[Estado Global e Hooks](file:///c:/Users/rafaf/Cursor/activity-logbook-hub/docs/estado-e-hooks.md)**
   * Fluxos do `AuthContext`, `ThemeContext` (suporte a 4 temas), além de hooks customizados como `useActivityStats`, `useIsMobile` e o hook global `useToast`.
5. **[Sistema de Exportação](file:///c:/Users/rafaf/Cursor/activity-logbook-hub/docs/sistema-de-exportacao.md)**
   * Geração de relatórios Excel em XLSX (básico) e ExcelJS (avançado com CDN dinâmico).
6. **[Interfaces, Layouts e Login](file:///c:/Users/rafaf/Cursor/activity-logbook-hub/docs/interface-e-layouts.md)**
   * Sistema de componentes baseados em Shadcn/ui, estrutura do `AppLayout`, interações de hover minimalistas na Sidebar e revitalização moderna da tela de login.
7. **[Padrões de Código e Otimizações de Performance](file:///c:/Users/rafaf/Cursor/activity-logbook-hub/docs/padroes-de-codigo-e-otimizacoes.md)**
   * Convenções de nomenclatura, templates estruturais de componentes React, Zod schemas, tratamentos de erro e técnicas de otimização (Lazy loading, memoização, queries otimizadas, debounce).
8. **[Mapeamento de Páginas e Comunicação com BD](file:///c:/Users/rafaf/Cursor/activity-logbook-hub/docs/mapeamento-paginas.md)**
   * Listagem detalhada de todas as rotas e páginas da aplicação, suas finalidades e a comunicação de leitura/escrita com o banco de dados.

---

## 🛠️ Contribuição e Padrões

Toda contribuição ou manutenção no código do projeto deve respeitar as convenções de nomenclatura e tratamento de erros definidas no documento de **[Padrões de Código](file:///c:/Users/rafaf/Cursor/activity-logbook-hub/docs/padroes-de-codigo-e-otimizacoes.md)**.
