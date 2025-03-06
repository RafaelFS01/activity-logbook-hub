
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Activity, ClipboardList, Clock } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];
const STATUS_NAMES = ["Concluída", "Em Andamento", "Futura"];

// Dados de exemplo para o dashboard
const activityStats = {
  today: {
    total: 12,
    inProgress: 5,
    future: 3
  },
  week: {
    total: 48,
    inProgress: 10,
    future: 15
  },
  month: {
    total: 156,
    inProgress: 25,
    future: 30
  }
};

const pieData = [
  { name: "Concluída", value: 25 },
  { name: "Em Andamento", value: 10 },
  { name: "Futura", value: 15 }
];

const Dashboard = () => {
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
              value={activityStats.today.total} 
              icon={<Activity />} 
            />
            <StatsCard 
              title="Em Andamento" 
              value={activityStats.today.inProgress} 
              icon={<Clock />} 
            />
            <StatsCard 
              title="Futuras" 
              value={activityStats.today.future} 
              icon={<ClipboardList />} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="week">
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard 
              title="Total de Atividades" 
              value={activityStats.week.total} 
              icon={<Activity />} 
            />
            <StatsCard 
              title="Em Andamento" 
              value={activityStats.week.inProgress} 
              icon={<Clock />} 
            />
            <StatsCard 
              title="Futuras" 
              value={activityStats.week.future} 
              icon={<ClipboardList />} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="month">
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard 
              title="Total de Atividades" 
              value={activityStats.month.total} 
              icon={<Activity />} 
            />
            <StatsCard 
              title="Em Andamento" 
              value={activityStats.month.inProgress} 
              icon={<Clock />} 
            />
            <StatsCard 
              title="Futuras" 
              value={activityStats.month.future} 
              icon={<ClipboardList />} 
            />
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atividades por Status</CardTitle>
            <CardDescription>Distribuição de atividades por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Últimas atividades registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ActivityItem 
                client="Empresa ABC" 
                description="Reunião de alinhamento estratégico" 
                status="Em Andamento" 
              />
              <ActivityItem 
                client="João Silva" 
                description="Consultoria financeira" 
                status="Concluída" 
              />
              <ActivityItem 
                client="Comércio XYZ" 
                description="Implantação de sistema" 
                status="Futura" 
              />
            </div>
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
      case "Futura": return "text-yellow-600 bg-yellow-100";
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
