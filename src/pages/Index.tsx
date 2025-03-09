
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Activity, ClipboardList, Clock, AlertCircle, AlertTriangle, CalendarRange } from "lucide-react";
import { useActivityStats } from "@/hooks/useActivityStats";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { ActivityStatus } from "@/services/firebase/activities";

const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#6b7280", "#ef4444"];
const STATUS_NAMES: Record<ActivityStatus, string> = {
  "completed": "Concluída",
  "in-progress": "Em Andamento",
  "pending": "Futura", // Changed from "Pendente" to "Futura"
  "cancelled": "Cancelada"
};

const Dashboard = () => {
  const { stats, isLoading: loadingStats } = useActivityStats();
  const { recentActivities, isLoading: loadingActivities } = useRecentActivities(3);
  
  // Preparar dados para o gráfico de pizza
  const getPieData = (period: 'today' | 'week' | 'month') => [
    { name: "Concluída", value: stats[period].completed },
    { name: "Em Andamento", value: stats[period].inProgress },
    { name: "Futura", value: stats[period].future }, // Changed from "Pendente" to "Futura"
    { name: "Pendente", value: stats[period].pending },
    { name: "Cancelada", value: stats[period].cancelled }
  ].filter(item => item.value > 0); // Remover categorias vazias
  
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">Painel de Controle</h1>
      
      <Tabs defaultValue="today" className="mb-8">
        <TabsList>
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="week">Esta Semana</TabsTrigger>
          <TabsTrigger value="month">Este Mês</TabsTrigger>
        </TabsList>
        
        <TabsContent value="today">
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard 
              title="Total de Atividades" 
              value={loadingStats ? "..." : stats.today.total} 
              icon={<Activity />} 
            />
            <StatsCard 
              title="Em Andamento" 
              value={loadingStats ? "..." : stats.today.inProgress} 
              icon={<Clock />} 
            />
            <StatsCard 
              title="Futuras" 
              value={loadingStats ? "..." : stats.today.future} 
              icon={<ClipboardList />} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="week">
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard 
              title="Total de Atividades" 
              value={loadingStats ? "..." : stats.week.total} 
              icon={<Activity />} 
            />
            <StatsCard 
              title="Em Andamento" 
              value={loadingStats ? "..." : stats.week.inProgress} 
              icon={<Clock />} 
            />
            <StatsCard 
              title="Futuras" 
              value={loadingStats ? "..." : stats.week.future} 
              icon={<ClipboardList />} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="month">
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard 
              title="Total de Atividades" 
              value={loadingStats ? "..." : stats.month.total} 
              icon={<Activity />} 
            />
            <StatsCard 
              title="Em Andamento" 
              value={loadingStats ? "..." : stats.month.inProgress} 
              icon={<Clock />} 
            />
            <StatsCard 
              title="Futuras" 
              value={loadingStats ? "..." : stats.month.future} 
              icon={<ClipboardList />} 
            />
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Atividades por Status</CardTitle>
            <CardDescription>Distribuição de atividades por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loadingStats ? (
                <div className="flex items-center justify-center h-full">
                  <p>Carregando dados...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieData('month')}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieData('month').map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Últimas atividades registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivities ? (
              <div className="flex items-center justify-center h-[300px]">
                <p>Carregando atividades...</p>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma atividade encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((item) => (
                  <ActivityItem
                    key={item.activity.id}
                    client={item.client?.name || "Cliente não encontrado"}
                    description={item.activity.title}
                    status={STATUS_NAMES[item.activity.status]}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Nova seção para atividades futuras e atrasadas */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              Atividades Futuras
            </CardTitle>
            <CardDescription>Próximas atividades agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center h-[200px]">
                <p>Carregando dados...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-8 w-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium">Total de Atividades Futuras</h4>
                      <p className="text-sm text-muted-foreground">Atividades agendadas para datas futuras</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{stats.all.future}</span>
                </div>
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-700">
                      Atividades com status "Futura" são aquelas que estão programadas para iniciar em datas futuras. 
                      Você pode gerenciá-las na página de atividades.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Atividades Atrasadas
            </CardTitle>
            <CardDescription>Atividades pendentes que já passaram da data de término</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center h-[200px]">
                <p>Carregando dados...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-md bg-amber-50 border-amber-200">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                    <div>
                      <h4 className="font-medium text-amber-800">Total de Atividades Atrasadas</h4>
                      <p className="text-sm text-amber-700">Atividades pendentes com data de término vencida</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-amber-700">{stats.all.overdue}</span>
                </div>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-amber-700">
                      Atividades atrasadas são aquelas que já passaram da data de término planejada 
                      mas ainda não foram concluídas ou canceladas. Recomendamos priorizá-las.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente para exibir as estatísticas em cards
const StatsCard = ({ title, value, icon }) => {
  return (
    <Card>
      <CardContent className="flex items-center p-6">
        <div className="mr-4 rounded-full p-2 bg-primary/10">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para os itens de atividade recente
const ActivityItem = ({ client, description, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "Concluída": return "text-green-600 bg-green-100";
      case "Em Andamento": return "text-blue-600 bg-blue-100";
      case "Futura": return "text-yellow-600 bg-yellow-100"; // Changed from "Pendente" to "Futura"
      case "Pendente": return "text-gray-600 bg-gray-100";
      case "Cancelada": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="flex justify-between items-center p-3 border rounded-md">
      <div>
        <h4 className="font-medium">{client}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {status}
      </span>
    </div>
  );
};

export default Dashboard;
