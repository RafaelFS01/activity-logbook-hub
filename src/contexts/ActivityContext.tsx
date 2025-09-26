import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Professional {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  lastSeen: Date;
  currentPage: string;
}

interface ActivityContextType {
  professionals: Professional[];
  activeProfessionals: Professional[];
  getActiveProfessionalsByPage: (page: string) => Professional[];
  updateProfessionalActivity: (professionalId: string, page: string, isActive: boolean) => void;
  registerProfessional: (professional: Omit<Professional, 'lastSeen'>) => void;
  unregisterProfessional: (professionalId: string) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};

interface ActivityProviderProps {
  children: ReactNode;
}

export const ActivityProvider: React.FC<ActivityProviderProps> = ({ children }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // Dados mockados para desenvolvimento
  useEffect(() => {
    const mockProfessionals: Professional[] = [
      {
        id: '1',
        name: 'Ana Silva',
        role: 'Enfermeira',
        isActive: true,
        lastSeen: new Date(),
        currentPage: '/home'
      },
      {
        id: '2',
        name: 'Carlos Santos',
        role: 'Médico',
        isActive: true,
        lastSeen: new Date(Date.now() - 300000), // 5 minutos atrás
        currentPage: '/activities'
      },
      {
        id: '3',
        name: 'Maria Oliveira',
        role: 'Técnica',
        isActive: false,
        lastSeen: new Date(Date.now() - 1800000), // 30 minutos atrás
        currentPage: '/clients'
      },
      {
        id: '4',
        name: 'João Pereira',
        role: 'Administrador',
        isActive: true,
        lastSeen: new Date(Date.now() - 60000), // 1 minuto atrás
        currentPage: '/reports'
      }
    ];

    setProfessionals(mockProfessionals);
  }, []);

  const activeProfessionals = professionals.filter(p => p.isActive);

  const getActiveProfessionalsByPage = (page: string): Professional[] => {
    return professionals.filter(p => p.isActive && p.currentPage === page);
  };

  const updateProfessionalActivity = (professionalId: string, page: string, isActive: boolean) => {
    setProfessionals(prev => prev.map(professional =>
      professional.id === professionalId
        ? {
            ...professional,
            currentPage: page,
            isActive,
            lastSeen: new Date()
          }
        : professional
    ));
  };

  const registerProfessional = (professionalData: Omit<Professional, 'lastSeen'>) => {
    const newProfessional: Professional = {
      ...professionalData,
      lastSeen: new Date()
    };

    setProfessionals(prev => {
      const existing = prev.find(p => p.id === professionalData.id);
      if (existing) {
        return prev.map(p => p.id === professionalData.id ? newProfessional : p);
      }
      return [...prev, newProfessional];
    });
  };

  const unregisterProfessional = (professionalId: string) => {
    setProfessionals(prev => prev.filter(p => p.id !== professionalId));
  };

  const value: ActivityContextType = {
    professionals,
    activeProfessionals,
    getActiveProfessionalsByPage,
    updateProfessionalActivity,
    registerProfessional,
    unregisterProfessional
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
};
