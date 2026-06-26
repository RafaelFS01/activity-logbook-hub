# 🎨 Interface, Layouts e Login

O **Activity Logbook Hub** possui uma interface altamente refinada baseada em um design system consistente, suporte nativo a múltiplos temas e atenção especial à acessibilidade e micro-interações.

---

## 🎨 Sistema de Design Shadcn/ui

Os componentes visuais utilizam como base o **Shadcn/ui**, uma coleção de componentes reativos e acessíveis desenvolvidos sobre o **Radix UI** (headless primitives) e estilizados via **Tailwind CSS**. A customização de variantes visuais é gerenciada por meio da biblioteca **Class Variance Authority (CVA)**.

---

## 📱 Sistema de Temas (Variáveis CSS)

O layout é dinâmico e suporta quatro paletas de cores distintas. A troca de tema aplica classes específicas na raiz HTML (`<html>`), redefinindo variáveis de cores HSL do Tailwind:

*   **Tema Light (Padrão):** Paleta clássica baseada em fundos claros e textos escuros com alto contraste.
*   **Tema Dark:** Tons escuros de cinza e azul ardósia para redução de fadiga visual em ambientes de baixa luminosidade.
*   **Tema H12:** Identidade corporativa baseada em tons sofisticados de azul marinho.
*   **Tema H12-Alternative:** Variação corporativa com fundos gradientes em roxo e azul escuro.

---

## 🏗️ Componentes de Layout

### 1. `AppLayout` (Layout Geral)
Estrutura de tela inteira dividida entre uma barra lateral de navegação e a área principal de conteúdo com rolagem independente.

```typescript
const AppLayout = () => {
  return (
    <div className="flex h-screen bg-background">
      <MainSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
```

### 2. `MainSidebar` (Barra Lateral)
A barra lateral renderiza dinamicamente as opções de menu de acordo com as permissões obtidas do `AuthContext`. Por exemplo, a rota `/collaborators` e a agenda geral `/home` são renderizadas e protegidas para exibição exclusiva de usuários com perfil `admin` ou `manager`.

#### Micro-interações na Sidebar:
Para manter a interface minimalista, a barra lateral aplica efeitos visuais sutis:
*   **Botões Inativos:** Fundo transparente com texto padrão. Ao passar o mouse (hover), ganham uma cor de fundo sutil (`bg-sidebar-accent/50`) e um leve deslocamento vertical negativo de 2px (`-translate-y-0.5`).
*   **Botão Ativo:** Destaca-se utilizando a cor primária do tema ativo (`bg-sidebar-primary`) e sombra projetada.
*   **Animação de Ícones:** Os ícones Lucide sofrem uma micro-escala (`scale-105`) com transição suave de 200ms em curvas `ease-out`.

---

## 📊 Estética Visual do Dashboard (`src/pages/Index.tsx`)

O Dashboard é projetado para consolidar os indicadores e métricas operacionais em tempo real:
*   **KPI Cards:** Cartões responsivos contendo estatísticas rápidas de atividades (total, concluídas, pendentes e em atraso). Cada cartão possui um gradiente sutil, sombras leves e ícones correspondentes da biblioteca Lucide React.
*   **Gráficos Reativos (Recharts):**
    *   *Gráfico de Rosca (Pie Chart):* Exibe de forma percentual a distribuição atual de status das atividades (Concluída, Em Andamento, Pendente, Cancelada e Atrasada), aplicando cores coordenadas por tema.
    *   *Gráfico de Barras Agrupadas (Bar Chart):* Demonstra graficamente a volumetria de atividades realizadas pela equipe ao longo dos dias, segmentadas por status, com tooltips estilizados sob hover.
*   **Controle Temporal por Abas:** Permite alternar os dados exibidos entre filtros Rápidos (Hoje, Semana Atual, Mês Atual e Geral).

---

## 🔐 Revitalização da Página de Login (`src/pages/Login.tsx`)

A página de login foi desenvolvida seguindo os mais altos padrões de design moderno (Glassmorphism), compatibilidade responsiva e acessibilidade avançada.

### Principais Características:

#### 1. Estética Premium e Glassmorphism
*   Fundo decorado com círculos desfocados (`backdrop-blur`) simulando vidro soprado.
*   Backgrounds dinâmicos em gradientes lineares de 135 graus ajustados a cada um dos quatro temas.
*   Animação de entrada fade-in de 700ms aplicada no container de autenticação.

#### 2. Responsividade Mobile-First
*   **Dispositivos Móveis:** Elementos decorativos com blur em segundo plano são ocultados para economizar processamento gráfico. Inputs de formulários recebem altura expandida para 48px (`h-12`) facilitando interações por toque e prevenindo zoom automático em navegadores iOS.
*   **Posicionamento do Botão de Temas:** Renderizado em modo fixo no canto superior direito (`fixed top-4 right-4`) com alto z-index, garantindo visibilidade e usabilidade tanto em telas móveis quanto em computadores.

#### 3. Acessibilidade (WCAG AA Compliance)
*   **Acessibilidade Teclado:** Foco visual altamente perceptível em inputs e botões.
*   **Aria Attributes:** Uso explícito de `aria-label`, `aria-describedby` para leitores de tela e `aria-invalid` para feedbacks visuais de erro em tempo de digitação.
*   **Textos de Suporte Ocultos:** Uso da classe `sr-only` (screen-reader only) para prover descrições adicionais para tecnologias assistivas.
*   **Preferência de Movimento Reduzido:** Caso o usuário tenha ativado o controle de movimentos reduzidos no sistema operacional (`prefers-reduced-motion`), as animações de entrada e transições de tema são reduzidas a 0ms automaticamente.

```css
@media (prefers-reduced-motion: reduce) {
  .login-container * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
