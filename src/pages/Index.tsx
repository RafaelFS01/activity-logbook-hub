import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, XAxis, YAxis, Bar, CartesianGrid } from "recharts";
import { Activity as ActivityIcon, ClipboardList, Clock, AlertCircle, AlertTriangle, CalendarRange, Loader2, CheckCircle2 } from "lucide-react";
import { useActivityStats } from "@/hooks/useActivityStats";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useFutureAndOverdueActivities } from "@/hooks/useFutureAndOverdueActivities";
import { ActivityStatus, getActivities, Activity } from "@/services/firebase/activities";

import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  format,
  startOfDay,
  isAfter,
  isBefore,
  isEqual,
  isWithinInterval,
  startOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isPast,
  endOfDay,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#ef4444", "#6b7280", "#A855F7"];
const STATUS_COLORS: Record<string, string> = {
  "Concluída": "#22c55e",
  "Em Andamento": "#3b82f6",
  "Futura": "#eab308",
  "Cancelada": "#ef4444",
  "Atrasada": "#6b7280",
};
const STATUS_NAMES: Record<ActivityStatus, string> = {
  "completed": "Concluída",
  "in-progress": "Em Andamento",
  "pending": "Futura",
  "cancelled": "Cancelada"
};
const STATUS_DISPLAY_NAMES: Record<ActivityStatus | 'overdue', string> = {
  "completed": "Concluída",
  "in-progress": "Em Andamento",
  "pending": "Pendente",
  "cancelled": "Cancelada",
  "overdue": "Atrasada"
};

type Period = 'today' | 'week' | 'month' | 'all';

interface BarChartDataItem {
  label: string;
  'Concluída': number;
  'Em Andamento': number;
  'Futura': number;
  'Cancelada': number;
  'Atrasada': number;
}

const isActivityFuture = (activity: Activity): boolean => {
  if (!activity.startDate) return false;
  try {
    const startDate = startOfDay(new Date(activity.startDate));
    const today = startOfDay(new Date());
    return isAfter(startDate, today);
  } catch (e) {
    console.error("Erro ao processar data de início para atividade futura:", activity.startDate, e);
    return false;
  }
};

const isActivityOverdue = (activity: Activity): boolean => {
  if (!activity.endDate || activity.status === 'completed' || activity.status === 'cancelled') {
    return false;
  }
  try {
    const endDateDay = startOfDay(new Date(activity.endDate));
    const today = startOfDay(new Date());
    return isBefore(endDateDay, today) && (activity.status === 'pending' || activity.status === 'in-progress');
  } catch (e) {
    console.error("Erro ao processar data de fim para atividade atrasada:", activity.endDate, e);
    return false;
  }
};

const activityOverlapsPeriod = (activity: Activity, periodStart: Date, periodEnd: Date): boolean => {
    if (!activity.startDate) return false;

    try {
        const activityStartDate = new Date(activity.startDate);
        const activityEndDate = activity.endDate ? new Date(activity.endDate) : null;

        if (isNaN(activityStartDate.getTime())) return false;
        if (activityEndDate && isNaN(activityEndDate.getTime())) return false;

        const periodStartOfDay = startOfDay(periodStart);
        const periodEndOfDay = endOfDay(periodEnd);

        const activityStartOfDay = startOfDay(activityStartDate);

        if (!activityEndDate) {
            return !isAfter(activityStartOfDay, periodEndOfDay);
        }

        const activityEndOfDay = startOfDay(activityEndDate);

        const startsWithin = isWithinInterval(activityStartOfDay, { start: periodStartOfDay, end: periodEndOfDay });
        const endsWithin = isWithinInterval(activityEndOfDay, { start: periodStartOfDay, end: periodEndOfDay });
        const spansPeriod = isBefore(activityStartOfDay, periodStartOfDay) && isAfter(activityEndOfDay, periodEndOfDay);
        const startsBeforeEndsWithin = isBefore(activityStartOfDay, periodStartOfDay) && (isEqual(activityEndOfDay, periodStartOfDay) || isAfter(activityEndOfDay, periodStartOfDay)) && (isEqual(activityEndOfDay, periodEndOfDay) || isBefore(activityEndOfDay, periodEndOfDay));
        const startsWithinEndsAfter = (isEqual(activityStartOfDay, periodStartOfDay) || isAfter(activityStartOfDay, periodStartOfDay)) && (isEqual(activityStartOfDay, periodEndOfDay) || isBefore(activityStartOfDay, periodEndOfDay)) && isAfter(activityEndOfDay, periodEndOfDay);

        return startsWithin || endsWithin || spansPeriod || startsBeforeEndsWithin || startsWithinEndsAfter;

    } catch (e) {
        console.error("Erro ao verificar sobreposição de atividade:", activity, e);
        return false;
    }
};

const Dashboard = () => {
  const { stats, isLoading: loadingStats, error: statsError } = useActivityStats();
  const { recentActivities, isLoading: loadingRecentActivities, error: recentActivitiesError } = useRecentActivities(5);
  const { futureActivities, overdueActivities, isLoading: loadingFutureOverdue, error: futureOverdueError } = useFutureAndOverdueActivities(5);

  const hasError = statsError || recentActivitiesError || futureOverdueError;
  const isLoading = loadingStats || loadingRecentActivities || loadingFutureOverdue;

  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoadingActivities(true);
        const activities = await getActivities();
        setAllActivities(activities);
      } catch (error) {
        console.error("Erro ao buscar todas as atividades:", error);
        setActivitiesError(error as Error);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, []);

  const [activePeriod, setActivePeriod] = useState<Exclude<Period, 'all'>>('today');

  const getPieData = (period: Period) => {
    if (!stats || !stats[period]) return [];

    const data = [
      { name: STATUS_DISPLAY_NAMES["completed"], value: stats[period].completed },
      { name: STATUS_DISPLAY_NAMES["in-progress"], value: stats[period].inProgress },
      { name: "Futura", value: stats[period].future },
      { name: STATUS_DISPLAY_NAMES["cancelled"], value: stats[period].cancelled },
    ];

    if (period === 'all' && stats.all.overdue > 0) {
       data.push({ name: STATUS_DISPLAY_NAMES["overdue"], value: stats.all.overdue });
    } else if (period !== 'all' && stats[period].overdue > 0) {
      data.push({ name: STATUS_DISPLAY_NAMES["overdue"], value: stats[period].overdue });
    }
    if (period !== 'all' && stats[period].pending > 0) {
      data.push({ name: STATUS_DISPLAY_NAMES["pending"], value: stats[period].pending });
    }

    return data.filter(item => item.value > 0);
  };

  const getBarChartData = (allActivitiesForChart: Activity[], period: Exclude<Period, 'all'>): BarChartDataItem[] => {
    if (!allActivitiesForChart || allActivitiesForChart.length === 0) return [];

    const todayDate = new Date();
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;

    if (period === 'today') {
      currentPeriodStart = startOfToday();
      currentPeriodEnd = startOfToday();
    } else if (period === 'week') {
      currentPeriodStart = startOfWeek(todayDate, { locale: ptBR });
      currentPeriodEnd = endOfWeek(todayDate, { locale: ptBR });
    } else {
      currentPeriodStart = startOfMonth(todayDate);
      currentPeriodEnd = endOfMonth(todayDate);
    }

    const relevantActivities = allActivitiesForChart.filter(activity =>
      activityOverlapsPeriod(activity, currentPeriodStart, currentPeriodEnd)
    );

    if (relevantActivities.length === 0) return [];

    const dataMap: Record<string, BarChartDataItem> = {};
    const sortedRelevantActivities = relevantActivities.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    sortedRelevantActivities.forEach(activity => {
      const startDate = new Date(activity.startDate);
      let key = '';
      let label = '';

      if (period === 'today') {
        if (isToday(startDate)) {
            key = startDate.getHours().toString();
            label = `${startDate.getHours()}h`;
        } else {
            key = "dia_todo";
            label = "Hoje";
        }
      } else if (period === 'week') {
        const dayOfWeek = startDate.getDay();
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        key = dayOfWeek.toString();
        label = days[dayOfWeek];
      } else if (period === 'month') {
        const dayOfMonth = startDate.getDate();
        key = dayOfMonth.toString();
        label = dayOfMonth.toString();
      }

      if (!key) return;

      if (!dataMap[key]) {
        dataMap[key] = { label, 'Concluída': 0, 'Em Andamento': 0, 'Futura': 0, 'Cancelada': 0, 'Atrasada': 0 };
      }

      let effectiveStatusName: string;
      if (isActivityOverdue(activity)) {
        effectiveStatusName = STATUS_DISPLAY_NAMES['overdue'];
      } else if (isActivityFuture(activity) && activity.status === 'pending') {
        effectiveStatusName = "Futura";
      } else {
        effectiveStatusName = STATUS_DISPLAY_NAMES[activity.status as ActivityStatus] || activity.status;
      }
      
      const validStatusKeys: (keyof Omit<BarChartDataItem, 'label'>)[] = ['Concluída', 'Em Andamento', 'Futura', 'Cancelada', 'Atrasada'];
      if (validStatusKeys.includes(effectiveStatusName as any)) {
          dataMap[key][effectiveStatusName as keyof Omit<BarChartDataItem, 'label'>] = (dataMap[key][effectiveStatusName as keyof Omit<BarChartDataItem, 'label'>] || 0) + 1;
      }
    });

    const chartData = Object.values(dataMap);

    if (period === 'today') {
        chartData.sort((a, b) => parseInt(a.label) - parseInt(b.label));
    } else if (period === 'week') {
        const daysOrder = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        chartData.sort((a, b) => daysOrder.indexOf(a.label) - daysOrder.indexOf(b.label));
    } else if (period === 'month') {
        chartData.sort((a, b) => parseInt(a.label) - parseInt(b.label));
    }

    return chartData;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dataItem = payload.reduce((acc: any, curr: any) => {
          acc[curr.dataKey] = curr.value;
          return acc;
      }, { label: payload[0].payload.label });

      return (
        <div className="bg-white p-2 border rounded shadow-md text-sm">
          <p className="font-medium">{`Tempo: ${dataItem.label}`}</p>
          {Object.keys(dataItem).filter(key => key !== 'label').map(statusKey => (
              <p key={statusKey} className="text-muted-foreground">{`${statusKey}: ${dataItem[statusKey]}`}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-2 border rounded shadow-md text-sm">
          <p className="font-medium">{`${data.name}: ${data.value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">Painel de Controle</h1>

      {(hasError || activitiesError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao buscar as informações do dashboard. Tente recarregar a página.
            {statsError && ` Erro estatísticas: ${statsError.message}`}
            {recentActivitiesError && ` Erro atividades recentes: ${recentActivitiesError.message}`}
            {futureOverdueError && ` Erro atividades futuras/atrasadas: ${futureOverdueError.message}`}
            {activitiesError && ` Erro atividades: ${activitiesError.message}`}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="today" className="mb-8" onValueChange={(value) => setActivePeriod(value as Exclude<Period, 'all'>)}>
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
                  icon={<ActivityIcon />}
                />
                <StatsCard
                  title="Concluída"
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
                  icon={<ActivityIcon />}
                />
                 <StatsCard
                  title="Concluída"
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
                  icon={<ActivityIcon />}
                />
                 <StatsCard
                  title="Concluída"
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

      <Card className="mt-6 mb-6">
        <CardHeader>
          <CardTitle>Atividades ao Longo do Tempo ({activePeriod === 'today' ? 'Hoje' : activePeriod === 'week' ? 'Esta Semana' : 'Este Mês'})</CardTitle>
          <CardDescription>Distribuição de atividades por status ao longo do tempo no período selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {loadingActivities ? (
              <div className="flex items-center justify-center h-full">
                 <Loader2 className="h-8 w-8 animate-spin mr-2" />
                 <p>Carregando dados do gráfico...</p>
              </div>
            ) : allActivities.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center">
                 <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                 <p className="text-muted-foreground">Sem dados de atividades para exibir o gráfico neste período.</p>
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getBarChartData(allActivities, activePeriod)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {Object.keys(STATUS_COLORS).map(status => (
                      <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Atividades por Status ({activePeriod === 'today' ? 'Hoje' : activePeriod === 'week' ? 'Esta Semana' : 'Este Mês'})</CardTitle>
            <CardDescription>Distribuição de atividades por status no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loadingStats ? (
                <div className="flex items-center justify-center h-full">
                   <Loader2 className="h-8 w-8 animate-spin mr-2" />
                   <p>Carregando gráfico...</p>
                </div>
              ) : getPieData(activePeriod).length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-center">
                   <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                   <p className="text-muted-foreground">Sem dados de atividades para exibir o gráfico neste período.</p>
                 </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieData(activePeriod)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {getPieData(activePeriod).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltipPie />} />
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
                      status={STATUS_DISPLAY_NAMES[item.activity.status as ActivityStatus] || item.activity.status}
                      isOverdue={isActivityOverdue(item.activity)}
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
                       status={STATUS_DISPLAY_NAMES[item.activity.status as ActivityStatus] || item.activity.status}
                       date={item.activity.startDate}
                       dateLabel="Início:"
                       isOverdue={isActivityOverdue(item.activity)}
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
                       status={STATUS_DISPLAY_NAMES[item.activity.status as ActivityStatus] || item.activity.status}
                       date={item.activity.endDate || item.activity.startDate}
                       dateLabel="Prazo:"
                       isOverdue={true}
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

const ActivityItem = ({ client, description, status, isOverdue }: { client: string; description: string; status: string; isOverdue?: boolean }) => {
  const getStatusColor = (status: string, overdue?: boolean) => {
    if (overdue) return "text-orange-600 bg-orange-100";
    switch (status) {
      case STATUS_DISPLAY_NAMES["completed"]: return "text-green-600 bg-green-100";
      case STATUS_DISPLAY_NAMES["in-progress"]: return "text-blue-600 bg-blue-100";
      case "Futura": return "text-yellow-600 bg-yellow-100";
      case STATUS_DISPLAY_NAMES["pending"]: return "text-purple-600 bg-purple-100";
      case STATUS_DISPLAY_NAMES["cancelled"]: return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const displayStatus = isOverdue ? STATUS_DISPLAY_NAMES['overdue'] : status;

  return (
    <div className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
      <div>
        <h4 className="font-medium">{client}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(status, isOverdue)}`}>
        {displayStatus}
      </span>
    </div>
  );
};

const ActivityItemWithDate = ({ client, description, status, date, dateLabel, isOverdue }: { client: string; description: string; status: string; date?: string; dateLabel: string; isOverdue?: boolean }) => {
  const getStatusColor = (status: string, overdue?: boolean) => {
    if (overdue) return "text-orange-600 bg-orange-100";
    switch (status) {
      case STATUS_DISPLAY_NAMES["completed"]: return "text-green-600 bg-green-100";
      case STATUS_DISPLAY_NAMES["in-progress"]: return "text-blue-600 bg-blue-100";
      case "Futura": return "text-yellow-600 bg-yellow-100";
      case STATUS_DISPLAY_NAMES["pending"]: return "text-purple-600 bg-purple-100";
      case STATUS_DISPLAY_NAMES["cancelled"]: return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const displayStatus = isOverdue ? STATUS_DISPLAY_NAMES['overdue'] : status;

  const formattedDate = date ? format(new Date(date), 'dd/MM/yyyy') : 'N/D';

  return (
    <div className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
      <div className="flex-1 overflow-hidden mr-2">
        <h4 className="font-medium truncate">{client}</h4>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
        <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">{dateLabel}</span> {formattedDate}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(status, isOverdue)}`}>
        {displayStatus}
      </span>
    </div>
  );
};

export default Dashboard;
