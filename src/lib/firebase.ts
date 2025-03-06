
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { toast } from '@/components/ui/use-toast';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Verifica se todas as variáveis de ambiente necessárias estão configuradas
const checkConfig = () => {
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_DATABASE_URL',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missingVars = requiredEnvVars.filter(
    envVar => !import.meta.env[envVar]
  );

  if (missingVars.length > 0) {
    console.error(
      `Firebase configuration error: Missing environment variables: ${missingVars.join(', ')}`
    );
    console.log('Please make sure to set all required Firebase environment variables');
    
    // Mostrar um toast se estiver em ambiente de desenvolvimento
    if (import.meta.env.DEV) {
      setTimeout(() => {
        toast({
          variant: "destructive",
          title: "Erro de configuração do Firebase",
          description: "Algumas variáveis de ambiente estão faltando. Verifique o console para mais detalhes."
        });
      }, 1000);
    }
    
    return false;
  }
  
  return true;
};

// Inicializa o Firebase apenas se a configuração estiver completa
let app;
let db;
let auth;

try {
  if (checkConfig()) {
    // Inicializa o Firebase
    app = initializeApp(firebaseConfig);
    
    // Inicializa o Realtime Database
    db = getDatabase(app);
    
    // Inicializa o Authentication
    auth = getAuth(app);
  } else {
    console.error('Firebase initialization skipped due to missing configuration');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export { db, auth };
export default app;
