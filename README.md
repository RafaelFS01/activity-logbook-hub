# Activity Logbook Hub

## 📋 Visão Geral

O **Activity Logbook Hub** é um sistema web completo desenvolvido para auxiliar no registro, acompanhamento e gerenciamento de atividades, clientes e colaboradores. Ele oferece uma interface centralizada e intuitiva para visualizar agendas, cadastrar novas atividades e gerenciar informações de clientes e da equipe.

### ✨ Características Principais

- 🏢 **Gestão Completa**: Controle de atividades, clientes e colaboradores em uma única plataforma
- 📅 **Agenda Dinâmica**: Visualização de atividades em formato de calendário (dia, semana, mês)
- 📊 **Dashboard Analítico**: Estatísticas e gráficos em tempo real sobre as atividades
- 👥 **Sistema de Permissões**: Controle de acesso baseado em roles (Admin, Manager, Collaborator)
- 📄 **Exportação de Dados**: Relatórios em Excel e PDF
- 🎨 **Múltiplos Temas**: Interface personalizável com 4 temas diferentes
- 🔄 **Sincronização em Tempo Real**: Dados atualizados instantaneamente via Firebase

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca para construção da interface
- **TypeScript** - Linguagem de programação tipada
- **Vite** - Build tool moderna e rápida
- **Tailwind CSS** - Framework CSS utilitário
- **Shadcn/ui** - Componentes UI baseados em Radix UI
- **React Router DOM** - Roteamento da aplicação
- **React Hook Form + Zod** - Validação de formulários
- **Recharts** - Biblioteca de gráficos
- **date-fns** - Manipulação de datas

### Backend & Banco de Dados
- **Firebase Authentication** - Autenticação de usuários
- **Firebase Realtime Database** - Banco de dados em tempo real
- **Firebase Hosting** - Hospedagem da aplicação

### Bibliotecas Auxiliares
- **xlsx** - Exportação para Excel
- **html2pdf.js** - Geração de PDFs
- **lucide-react** - Ícones
- **uuid** - Geração de IDs únicos

## 🏗️ Estrutura do Projeto

```
activity-logbook-hub/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── auth/           # Componentes de autenticação
│   │   ├── layout/         # Componentes de layout
│   │   ├── reports/        # Templates de relatórios
│   │   └── ui/             # Componentes UI (Shadcn)
│   ├── contexts/           # Contextos React (Auth, Theme)
│   ├── hooks/              # Hooks customizados
│   ├── lib/                # Utilitários e configurações
│   ├── pages/              # Páginas da aplicação
│   │   ├── activities/     # Gestão de atividades
│   │   ├── clients/        # Gestão de clientes
│   │   └── collaborators/  # Gestão de colaboradores
│   ├── services/           # Serviços (Firebase, Gemini)
│   └── utils/              # Funções utilitárias
├── docs/                   # Documentação do projeto
├── public/                 # Arquivos estáticos
└── dist/                   # Build de produção
```

## 🔐 Sistema de Autenticação e Permissões

### Roles de Usuário
- **Admin**: Acesso completo ao sistema
- **Manager**: Gerenciamento de atividades e visualização de relatórios
- **Collaborator**: Acesso limitado às próprias atividades

### Funcionalidades por Role

| Funcionalidade | Admin | Manager | Collaborator |
|----------------|-------|---------|--------------|
| Dashboard Completo | ✅ | ✅ | ❌ |
| Gestão de Atividades | ✅ | ✅ | ✅* |
| Gestão de Clientes | ✅ | ✅ | ✅ |
| Gestão de Colaboradores | ✅ | ✅ | ❌ |
| Relatórios e Exportação | ✅ | ✅ | ❌ |

*Colaboradores podem ver apenas atividades atribuídas a eles

## 📊 Banco de Dados (Firebase Realtime Database)

### Estrutura Principal

```json
{
  "users": {
    "[UID]": {
      "name": "string",
      "email": "string",
      "role": "admin|manager|collaborator",
      "active": "boolean",
      "cpf": "string",
      "phone": "string",
      "birthDate": "string",
      "admissionDate": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  },
  "clients": {
    "[ID]": {
      "name": "string",
      "type": "fisica|juridica",
      "email": "string",
      "phone": "string",
      "address": "string",
      "active": "boolean",
      "cpf": "string", // Para PF
      "cnpj": "string", // Para PJ
      "companyName": "string", // Para PJ
      "createdAt": "string",
      "updatedAt": "string"
    }
  },
  "activities": {
    "[ID]": {
      "title": "string",
      "description": "string",
      "clientId": "string",
      "assignedTo": "string[]",
      "status": "pending|in-progress|completed|cancelled",
      "priority": "low|medium|high",
      "startDate": "string",
      "endDate": "string",
      "completedDate": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
}
```

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+ ou Bun
- Conta no Firebase
- Firebase CLI (para desenvolvimento e deploy)
- Git

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/activity-logbook-hub.git
cd activity-logbook-hub
```

### 2. Instale o Firebase CLI
```bash
# Instalar Firebase CLI globalmente
npm install -g firebase-tools

# Fazer login no Firebase
firebase login

# Verificar se está logado
firebase projects:list
```

### 3. Instale as Dependências
```bash
# Com npm
npm install

# Com bun (recomendado)
bun install
```

### 4. Configure o Firebase
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative Authentication (Email/Password) e Realtime Database
3. Crie o arquivo `src/lib/firebase.ts` com suas credenciais:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "sua-api-key",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com/",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "sua-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
```

### 3. Configure o .env (2° Alternativa para o Firebase)
1. Crie o arquivo `.env.local` com suas credenciais:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
```

### 5. Inicialize o Firebase no Projeto (Opcional)
```bash
# Inicializar Firebase no projeto (se necessário)
firebase init

# Selecionar:
# - Hosting: Configure files for Firebase Hosting
# - Realtime Database: Configure a security rules file

# Conectar ao projeto Firebase
firebase use --add
```

### 6. Execute o Projeto
```bash
# Desenvolvimento
npm run dev
# ou
bun run dev

# Build para produção
npm run build
# ou
bun run build

# Deploy para Firebase Hosting (opcional)
firebase deploy
```

## 🎯 Como Usar

### 1. Primeiro Acesso
- Acesse `/admin-setup` para criar o primeiro usuário administrador
- Faça login com as credenciais criadas

### 2. Navegação Principal
- **Dashboard**: Visão geral com estatísticas e gráficos
- **Agenda**: Visualização de atividades em calendário
- **Atividades**: Gestão completa de atividades
- **Clientes**: Cadastro e gestão de clientes
- **Colaboradores**: Gestão de usuários do sistema (Admin/Manager)

### 3. Funcionalidades Principais

#### Gestão de Atividades
- Criar, editar e excluir atividades
- Atribuir responsáveis e definir prioridades
- Acompanhar status e prazos
- Filtrar por período, status, cliente ou responsável

#### Gestão de Clientes
- Cadastro de Pessoa Física ou Jurídica
- Histórico de atividades por cliente
- Exportação de dados

#### Dashboard e Relatórios
- Gráficos de status e prioridades
- Atividades recentes e em atraso
- Exportação para Excel e PDF

## 📱 Temas Disponíveis

O sistema oferece 4 temas personalizáveis:
- **Light**: Tema claro padrão
- **Dark**: Tema escuro
- **H12**: Tema corporativo azul
- **H12 Alt**: Variação do tema corporativo

## 🔧 Scripts Disponíveis

### Scripts do Projeto
```json
{
  "dev": "vite",                    // Servidor de desenvolvimento
  "build": "vite build",            // Build de produção
  "build:dev": "vite build --mode development", // Build de desenvolvimento
  "lint": "eslint .",               // Verificação de código
  "preview": "vite preview"         // Preview do build
}
```

### Comandos Firebase CLI
```bash
# Deploy completo
firebase deploy

# Deploy apenas hosting
firebase deploy --only hosting

# Deploy apenas database rules
firebase deploy --only database

# Servir localmente
firebase serve

# Ver logs do projeto
firebase functions:log
```

## 📄 Exportação de Dados

### Formatos Suportados
- **Excel (.xlsx)**: Listas de atividades, clientes e colaboradores
- **PDF**: Relatórios de agenda e atividades

### Funcionalidades de Exportação
- Formatação automática com cores e estilos
- Filtros e ordenação preservados
- Cabeçalhos e títulos personalizados
- Larguras de coluna otimizadas

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

**Rafael Figueiredo de Souza**

## 🆘 Suporte

Para suporte e dúvidas:
1. Consulte a documentação em `/docs`
2. Abra uma issue no GitHub
3. Entre em contato com o administrador do sistema

---

**Activity Logbook Hub** - Centralize, organize e controle suas atividades de forma eficiente! 🚀