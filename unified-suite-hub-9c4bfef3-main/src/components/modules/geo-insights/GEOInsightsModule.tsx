import { BarChart3, TrendingUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface GEOInsightsModuleProps {
  activeItem: string;
}

export function GEOInsightsModule({ activeItem }: GEOInsightsModuleProps) {
  if (activeItem !== 'dashboard') {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-2 capitalize">
          {activeItem.replace('-', ' ')}
        </h2>
        <p className="text-muted-foreground">This section is coming soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time Visibility for{' '}
            <Button variant="link" className="px-0 underline">
              Select Project
            </Button>
          </p>
        </div>
        <Button>
          <TrendingUp className="w-4 h-4 mr-2" />
          Launch Audit
        </Button>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Visibility Share Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Visibility Share Percentage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-4 px-4">
              {[35, 45, 55, 75].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 bg-muted rounded-t transition-all hover:bg-muted-foreground/20"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Brand Health Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-center">
              Brand Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset="283"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">0</span>
                <span className="text-xs text-muted-foreground uppercase">Calculating</span>
              </div>
            </div>
            <div className="flex gap-8 mt-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Visibility</p>
                <p className="font-semibold">0%</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Trend</p>
                <p className="font-semibold text-success">Stable</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domain Mix */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Domain Mix
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <p className="text-4xl font-bold">0</p>
            <p className="text-sm text-muted-foreground uppercase">Citations</p>
          </CardContent>
        </Card>

        {/* Top Sources Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Top Sources Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Name</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No source data available yet
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
