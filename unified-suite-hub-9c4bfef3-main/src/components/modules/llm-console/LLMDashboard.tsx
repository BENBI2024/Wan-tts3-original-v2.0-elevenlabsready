import { Wallet, Send, Coins, Gauge, BarChart3, RefreshCw } from 'lucide-react';
import { StatCard } from './StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function LLMDashboard() {
  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">👋 Good morning, John</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your API usage today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          iconBg="bg-primary/10"
          label="Current Balance"
          value="$199.96"
          subLabel="Historical Spend"
          subValue="$0.04"
          action={
            <Button variant="outline" size="sm">
              Top Up
            </Button>
          }
        />
        <StatCard
          icon={<Send className="w-5 h-5" />}
          iconBg="bg-primary/10"
          label="Request Count"
          value="5"
          subLabel="Total Requests"
          subValue="0"
        />
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          iconBg="bg-primary/10"
          label="Token Quota"
          value="$0.00"
          subLabel="Total Tokens"
          subValue="0"
        />
        <StatCard
          icon={<Gauge className="w-5 h-5" />}
          iconBg="bg-primary/10"
          label="Avg RPM"
          value="0.000"
          subLabel="Avg TPM"
          subValue="0"
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Model Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="distribution" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="distribution">Cost Distribution</TabsTrigger>
                <TabsTrigger value="trend">Usage Trend</TabsTrigger>
                <TabsTrigger value="calls">API Calls</TabsTrigger>
                <TabsTrigger value="ranking">Model Ranking</TabsTrigger>
              </TabsList>
              <TabsContent value="distribution" className="mt-0">
                <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
                  <div className="text-center">
                    <p className="text-lg font-semibold">Model Cost Distribution</p>
                    <p className="text-sm text-muted-foreground mt-1">Total: $0.00</p>
                    <div className="mt-6 text-muted-foreground">
                      <div className="inline-flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 bg-foreground rounded-sm" />
                        <span>No data available</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="trend">
                <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Usage trend chart</p>
                </div>
              </TabsContent>
              <TabsContent value="calls">
                <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">API calls chart</p>
                </div>
              </TabsContent>
              <TabsContent value="ranking">
                <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Model ranking chart</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* API Info Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              API Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
              <div className="w-24 h-24 mb-4 text-muted-foreground/30">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <circle cx="50" cy="30" r="20" />
                  <path d="M25 85 Q25 55 50 55 Q75 55 75 85" />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">No API key configured</p>
              <Button variant="outline" size="sm" className="mt-4">
                Create API Key
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
