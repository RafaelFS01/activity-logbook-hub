import React, { createContext, useContext, useEffect, useState } from "react";

// Passo 1.1: Adicionar 'h12-alt' ao tipo Theme
type Theme = "light" | "dark" | "h12" | "h12-alt";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    // Validar se o tema salvo ainda é um dos tipos válidos
    if (savedTheme && ["light", "dark", "h12", "h12-alt"].includes(savedTheme)) {
      return savedTheme;
    }

    // Limpar tema inválido do localStorage se existir
    if (savedTheme) {
      localStorage.removeItem("theme");
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  });

  // Passo 1.2: Atualizar toggleTheme para incluir 'h12-alt' no ciclo
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      if (prevTheme === "light") return "dark";
      if (prevTheme === "dark") return "h12";
      if (prevTheme === "h12") return "h12-alt"; // Nova transição
      // Se for 'h12-alt' ou qualquer outro caso inesperado, volta para 'light'
      return "light";
    });
  };

  // Passo 1.3: Atualizar useEffect para manipular a classe 'h12-alt'
  useEffect(() => {
    localStorage.setItem("theme", theme);

    // Limpar todas as classes de tema antes de adicionar a correta
    document.documentElement.classList.remove("dark", "h12", "h12-alt");

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "h12") {
      document.documentElement.classList.add("h12");
    } else if (theme === "h12-alt") { // Adicionar condição para h12-alt
      document.documentElement.classList.add("h12-alt");
    }
    // Se for 'light', nenhuma classe é adicionada (como antes)

  }, [theme]);

  return (
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}