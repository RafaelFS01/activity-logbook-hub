import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Activity, ClipboardList, Clock, AlertCircle, AlertTriangle, CalendarRange, Loader2, CheckCircle2 } from "lucide-react";
import { useActivityStats } from "@/hooks/useActivityStats";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useFutureAndOverdueActivities } from "@/hooks/useFutureAndOverdueActivities";
import { ActivityStatus } from "@/services/firebase/activities";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from 'date-fns';

const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#ef4444", "#6b7280"];
const STATUS_NAMES: Record<ActivityStatus, string> = {
  "completed": "Concluída",
  "in-progress": "Em Andamento",
  "pending": "Futura",
  "cancelled": "Cancelada"
};

type Period = 'today' | 'week' | 'month' | 'all'; // Definir tipo para períodos

const Dashboard = () => {
  const { stats, isLoading: loadingStats, error: statsError } = useActivityStats();
  const { recentActivities, isLoading: loadingRecentActivities, error: recentActivitiesError } = useRecentActivities(5);
  const { futureActivities, overdueActivities, isLoading: loadingFutureOverdue, error: futureOverdueError } = useFutureAndOverdueActivities(5);

  const hasError = statsError || recentActivitiesError || futureOverdueError;
  const isLoading = loadingStats || loadingRecentActivities || loadingFutureOverdue;

  const [activePeriod, setActivePeriod] = useState<Exclude<Period, 'all'>>('today'); // Estado para o período ativo, excluindo 'all'

  const getPieData = (period: Period) => { // Permitir 'all' aqui para o gráfico total
    if (!stats || !stats[period]) return [];

    const data = [
      { name: STATUS_NAMES["completed"], value: stats[period].completed },
      { name: STATUS_NAMES["in-progress"], value: stats[period].inProgress },
      { name: STATUS_NAMES["pending"], value: stats[period].future },
      { name: STATUS_NAMES["cancelled"], value: stats[period].cancelled },
    ].filter(item => item.value > 0);

    if (period === 'all' && stats.all.overdue > 0) {
       data.push({ name: "Atrasada", value: stats.all.overdue });
    }

    return data;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white p-2 border rounded shadow-md text-sm">
          <p className="font-medium">{`${data.name}: ${data.value}`}</p>
          <p className="text-muted-foreground">{`(${percentage}%)`}</p>
        </div>
      );
    }
    return null;
  };


  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">Painel de Controle</h1>

      {hasError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao buscar as informações do dashboard. Tente recarregar a página.
            {statsError && ` Erro estatísticas: ${statsError.message}`}
            {recentActivitiesError && ` Erro atividades recentes: ${recentActivitiesError.message}`}
            {futureOverdueError && ` Erro atividades futuras/atrasadas: ${futureOverdueError.message}`}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="today" className="mb-8" onValueChange={(value) => setActivePeriod(value as Exclude<Period, 'all'>)}> {/* Adicionar onValueChange */}
        <TabsList>
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="week">Esta Semana</TabsTrigger>
          <TabsTrigger value="month">Este Mês</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <div className="grid gap-4 md:grid-cols-4">
            {loadingStats ? (
              <>
                <Skeleton className="h-[100px]" />
                <Skeleton className="h-[100px]" />
                <Skeleton className="h-[100px]" />
                <Skeleton className="h-[100px]" />
              </>
            ) : (
              <>
                <StatsCard
                  title="Total de Atividades"
                  value={stats.today.total}
                  icon={<Activity />}
                />
                <StatsCard
                  title="Concluídas"
                  value={stats.today.completed}
                  icon={<CheckCircle2 />}
                />
                <StatsCard
                  title="Em Andamento"
                  value={stats.today.inProgress}
                  icon={<Clock />}
                />
                <StatsCard
                  title="Futuras"
                  value={stats.today.future}
                  icon={<ClipboardList />}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="week">
          <div className="grid gap-4 md:grid-cols-4">
            {loadingStats ? (
              <>
                <Skeleton className="h-[100px]" />
                <Skeleton className="h-[100px]" />
                <Skeleton className="h-[100px]" />
                <Skeleton className="h-[100px]" />
              </>
            ) : (
              <>
                <StatsCard
                  title="Total de Atividades"
                  value={stats.week.total}
                  icon={<Activity />}
                />
                 <StatsCard
                  title="Concluídas"
                  value={stats.week.completed}
                  icon={<CheckCircle2 />}
                />
                <StatsCard
                  title="Em Andamento"
                  value={stats.week.inProgress}
                  icon={<Clock />}
                />
                <StatsCard
                  title="Futuras"
                  value={stats.week.future}
                  icon={<ClipboardList />}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="month">
          <div className="grid gap-4 md:grid-cols-4">
            {loadingStats ? (
              <>
                <Skeleton className="h-[100px]" />
                <Skeleton className="h-[100px]" />
                <Skeleton className="h-[100px]" />
                <Skeleton className="h-[100px]" />
              </>
            ) : (
              <>
                <StatsCard
                  title="Total de Atividades"
                  value={stats.month.total}
                  icon={<Activity />}
                />
                 <StatsCard
                  title="Concluídas"
                  value={stats.month.completed}
                  icon={<CheckCircle2 />}
                />
                <StatsCard
                  title="Em Andamento"
                  value={stats.month.inProgress}
                  icon={<Clock />}
                />
                <StatsCard
                  title="Futuras"
                  value={stats.month.future}
                  icon={<ClipboardList />}
                />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            {/* Título do gráfico agora reflete o período ativo */}
            <CardTitle>Atividades por Status ({activePeriod === 'today' ? 'Hoje' : activePeriod === 'week' ? 'Esta Semana' : 'Este Mês'})</CardTitle>
            <CardDescription>Distribuição de atividades por status no período selecionado</CardDescription> {/* Descrição ajustada */}
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loadingStats ? (
                <div className="flex items-center justify-center h-full">
                   <Loader2 className="h-8 w-8 animate-spin mr-2" />
                   <p>Carregando gráfico...</p>
                </div>
              ) : getPieData(activePeriod).length === 0 ? ( // Usar activePeriod aqui
                 <div className="flex flex-col items-center justify-center h-full text-center">
                   <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                   <p className="text-muted-foreground">Sem dados de atividades para exibir o gráfico neste período.</p> {/* Mensagem ajustada */}
                 </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieData(activePeriod)} // Usar activePeriod aqui
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieData(activePeriod).map((entry, index) => ( // Usar activePeriod aqui
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
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
            {loadingRecentActivities ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <p>Carregando atividades recentes...</p>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma atividade recente encontrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((item) => (
                  <Link key={item.activity.id} to={`/activities/${item.activity.id}`}>
                    <ActivityItem
                      client={item.client?.name || (item.client as any)?.companyName || "Cliente não encontrado"}
                      description={item.activity.title}
                      status={STATUS_NAMES[item.activity.status] || item.activity.status}
                    />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              Próximas Atividades Futuras
            </CardTitle>
            <CardDescription>As próximas {futureActivities.length} atividades agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingFutureOverdue ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <p>Carregando atividades futuras...</p>
              </div>
            ) : futureActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma atividade futura encontrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {futureActivities.map((item) => (
                   <Link key={item.activity.id} to={`/activities/${item.activity.id}`}>
                     <ActivityItemWithDate
                       client={item.client?.name || (item.client as any)?.companyName || "Cliente não encontrado"}
                       description={item.activity.title}
                       status={STATUS_NAMES[item.activity.status] || item.activity.status}
                       date={item.activity.startDate}
                       dateLabel="Início:"
                     />
                   </Link>
                ))}
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
            <CardDescription>As {overdueActivities.length} atividades pendentes mais antigas que já passaram da data de término</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingFutureOverdue ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <p>Carregando atividades atrasadas...</p>
              </div>
            ) : overdueActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma atividade atrasada encontrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {overdueActivities.map((item) => (
                   <Link key={item.activity.id} to={`/activities/${item.activity.id}`}>
                     <ActivityItemWithDate
                       client={item.client?.name || (item.client as any)?.companyName || "Cliente não encontrado"}
                       description={item.activity.title}
                       status={STATUS_NAMES[item.activity.status] || item.activity.status}
                       date={item.activity.endDate || item.activity.startDate}
                       dateLabel="Prazo:"
                     />
                   </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) => {
  return (
    <Card>
      <CardContent className="flex items-center p-6">
        <div className="mr-4 rounded-full p-2 bg-primary/10 text-primary">
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

const ActivityItem = ({ client, description, status }: { client: string; description: string; status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluída": return "text-green-600 bg-green-100";
      case "Em Andamento": return "text-blue-600 bg-blue-100";
      case "Futura": return "text-yellow-600 bg-yellow-100";
      case "Cancelada": return "text-red-600 bg-red-100";
      case "Atrasada": return "text-orange-600 bg-orange-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
      <div>
        <h4 className="font-medium">{client}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(status)}`}>
        {status}
      </span>
    </div>
  );
};

const ActivityItemWithDate = ({ client, description, status, date, dateLabel }: { client: string; description: string; status: string; date?: string; dateLabel: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluída": return "text-green-600 bg-green-100";
      case "Em Andamento": return "text-blue-600 bg-blue-100";
      case "Futura": return "text-yellow-600 bg-yellow-100";
      case "Cancelada": return "text-red-600 bg-red-100";
      case "Atrasada": return "text-orange-600 bg-orange-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const formattedDate = date ? format(new Date(date), 'dd/MM/yyyy') : 'N/D';

  return (
    <div className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
      <div className="flex-1 overflow-hidden mr-2">
        <h4 className="font-medium truncate">{client}</h4>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
        <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">{dateLabel}</span> {formattedDate}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(status)}`}>
        {status}
      </span>
    </div>
  );
};


export default Dashboard;
