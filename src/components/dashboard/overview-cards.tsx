import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CircleDollarSign, Landmark, Users, AlertTriangle } from 'lucide-react';

export function OverviewCards() {
  const stats = [
    {
      title: 'Total Portfolio',
      value: formatCurrency(125340.50),
      icon: CircleDollarSign,
      description: '+5.2% from last month',
    },
    {
      title: 'Active Loans',
      value: '89',
      icon: Users,
      description: '+10 since last month',
    },
    {
      title: 'Overdue Amount',
      value: formatCurrency(5230.0),
      icon: AlertTriangle,
      description: '12 loans currently overdue',
      className: 'text-destructive',
    },
    {
      title: 'Branches',
      value: '3',
      icon: Landmark,
      description: '1 new branch this quarter',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.className || ''}`}>{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
