import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, FileImage, FileText, AlertTriangle, TrendingUp, Users, Target, Shield, Zap, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  ZAxis,
} from 'recharts';

// Mock data for charts
const industryTrendData = [
  { week: 'W1', heat: 65 },
  { week: 'W2', heat: 72 },
  { week: 'W3', heat: 68 },
  { week: 'W4', heat: 85 },
  { week: 'W5', heat: 78 },
  { week: 'W6', heat: 92 },
  { week: 'W7', heat: 88 },
  { week: 'W8', heat: 95 },
];

const radarData = [
  { subject: '内容质量', myBrand: 85, competitor: 70, fullMark: 100 },
  { subject: 'SEO表现', myBrand: 72, competitor: 85, fullMark: 100 },
  { subject: '价格竞争力', myBrand: 78, competitor: 65, fullMark: 100 },
  { subject: '品牌声量', myBrand: 65, competitor: 80, fullMark: 100 },
  { subject: '用户互动', myBrand: 90, competitor: 75, fullMark: 100 },
];

const demographicsData = [
  { age: '18-24', percentage: 35 },
  { age: '25-30', percentage: 42 },
  { age: '31-40', percentage: 18 },
  { age: '41-50', percentage: 4 },
  { age: '50+', percentage: 1 },
];

const demandMatrixData = [
  { x: 75, y: 85, z: 200, name: '产品质量', quadrant: 1 },
  { x: 45, y: 80, z: 150, name: '价格敏感', quadrant: 2 },
  { x: 80, y: 35, z: 180, name: '物流速度', quadrant: 4 },
  { x: 30, y: 40, z: 120, name: '售后服务', quadrant: 3 },
  { x: 65, y: 60, z: 160, name: '品牌信任', quadrant: 1 },
];

const seoKeywordsData = [
  { keyword: '美妆护肤', ranking: 2, traffic: 12500 },
  { keyword: '平价彩妆', ranking: 5, traffic: 8200 },
  { keyword: '学生党好物', ranking: 3, traffic: 9800 },
  { keyword: '口红推荐', ranking: 8, traffic: 5600 },
];

const contentAuditData = [
  { id: 1, title: '夏日清爽妆容教程', type: 'Video', interactions: 25600, risk: 'low', date: '2024-01-15' },
  { id: 2, title: '新品唇釉试色', type: 'Video', interactions: 18900, risk: 'low', date: '2024-01-14' },
  { id: 3, title: '敏感肌护肤分享', type: 'Image', interactions: 12300, risk: 'medium', date: '2024-01-13' },
  { id: 4, title: '促销活动预告', type: 'Image', interactions: 8700, risk: 'high', date: '2024-01-12' },
];

const riskData = [
  { item: 'SEO关键词覆盖不足', level: 'high', signal: '主要关键词排名下降15位', advice: '增加长尾关键词内容布局' },
  { item: '内容更新频率低', level: 'medium', signal: '周均发布量低于竞品40%', advice: '提升至每日1-2条优质内容' },
  { item: '用户互动率下滑', level: 'medium', signal: '评论回复率仅23%', advice: '建立24小时内回复机制' },
];

const actionPlanData = [
  { period: '第1-2周', seo: '关键词优化，提升TOP10占比', social: '日更1条短视频', operation: '搭建私域流量池' },
  { period: '第3-4周', seo: '竞品关键词狙击', social: '达人合作3-5位', operation: '会员体系上线' },
  { period: '第5-8周', seo: '品牌词霸屏策略', social: '直播带货测试', operation: '复购激励计划' },
];

interface BrandHealthProps {
  onNavigate?: (itemId: string) => void;
}

export function BrandHealth({ onNavigate }: BrandHealthProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  
  const [view, setView] = useState<'input' | 'report'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    shopLink: '',
    competitors: '',
  });

  const handleGenerate = () => {
    if (!formData.brandName.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setView('report');
    }, 1500);
  };

  const handleBack = () => {
    setView('input');
  };

  // Input Form View
  if (view === 'input') {
    return (
      <div className="min-h-full bg-muted/30 p-6 md:p-8">
        <div className="mx-auto max-w-2xl animate-fade-in">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              {isZh ? '品牌健康度分析' : 'Brand Health Analysis'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isZh ? '输入品牌信息，生成全面的洞察分析报告' : 'Enter brand information to generate comprehensive insights'}
            </p>
          </div>

          {/* Input Card */}
          <Card className="shadow-lg">
            <CardContent className="space-y-6 p-6 md:p-8">
              {/* Brand Name */}
              <div className="space-y-2">
                <Label htmlFor="brandName" className="text-sm font-medium">
                  {isZh ? '品牌名称' : 'Brand Name'} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="brandName"
                  placeholder={isZh ? '如: AOS' : 'e.g., AOS'}
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="h-11"
                />
              </div>

              {/* Shop Link */}
              <div className="space-y-2">
                <Label htmlFor="shopLink" className="text-sm font-medium">
                  {isZh ? '店铺链接' : 'Shop Link'}
                </Label>
                <Input
                  id="shopLink"
                  placeholder="TikTok @example_shop"
                  value={formData.shopLink}
                  onChange={(e) => setFormData({ ...formData, shopLink: e.target.value })}
                  className="h-11"
                />
              </div>

              {/* Competitors */}
              <div className="space-y-2">
                <Label htmlFor="competitors" className="text-sm font-medium">
                  {isZh ? '推荐竞品' : 'Competitors'}
                </Label>
                <Input
                  id="competitors"
                  placeholder="BrandX, BrandY, BrandZ"
                  value={formData.competitors}
                  onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
                  className="h-11"
                />
              </div>

              {/* Generate Button */}
              <Button
                className="h-12 w-full bg-orange-500 text-base font-medium hover:bg-orange-600"
                onClick={handleGenerate}
                disabled={!formData.brandName.trim() || isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {isZh ? '生成中...' : 'Generating...'}
                  </div>
                ) : (
                  isZh ? '生成报告' : 'Generate Report'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Report Dashboard View
  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="min-h-full bg-muted/30 p-4 md:p-6">
        <div className="mx-auto max-w-7xl animate-fade-in">
          {/* Top Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              {isZh ? '返回重新生成' : 'Back to Regenerate'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <FileImage className="h-4 w-4" />
                {isZh ? '导出图片' : 'Export Image'}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                {isZh ? '导出 PDF' : 'Export PDF'}
              </Button>
            </div>
          </div>

          {/* Report Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {formData.brandName} {isZh ? '品牌健康度报告' : 'Brand Health Report'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isZh ? '生成时间：2024年1月16日' : 'Generated: January 16, 2024'}
            </p>
          </div>

          {/* Section 0: Summary & Risks */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Executive Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-orange-500" />
                  {isZh ? '执行摘要' : 'Executive Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <span>{isZh ? '行业热度持续上升，近8周增长46%，市场机会窗口期' : 'Industry heat rising continuously, 46% growth in 8 weeks'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <span>{isZh ? '内容更新频率落后竞品，建议提升发布节奏' : 'Content update frequency lags competitors, suggest increasing pace'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <span>{isZh ? 'SEO关键词覆盖存在差距，需重点优化TOP10关键词' : 'SEO keyword coverage gaps exist, focus on TOP10 optimization'}</span>
                  </li>
                </ul>
                <div className="grid grid-cols-3 gap-3 border-t pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">72</div>
                    <div className="text-xs text-muted-foreground">{isZh ? 'SEO可见度' : 'SEO Visibility'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">85</div>
                    <div className="text-xs text-muted-foreground">{isZh ? '社交互动' : 'Social Interaction'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">68</div>
                    <div className="text-xs text-muted-foreground">{isZh ? '竞争指数' : 'Competition Index'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Redlines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  {isZh ? '风险红线' : 'Risk Redlines'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskData.map((risk, idx) => (
                    <div key={idx} className="rounded-lg border bg-muted/30 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">{risk.item}</span>
                        <Badge variant={risk.level === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                          {risk.level === 'high' ? (isZh ? '高风险' : 'High') : (isZh ? '中风险' : 'Medium')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{risk.signal}</p>
                      <p className="mt-1 text-xs text-orange-600">→ {risk.advice}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 1: Market Insights */}
          <div className="mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              {isZh ? '市场洞察' : 'Market Insights'}
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Industry Heat Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{isZh ? '行业热度趋势' : 'Industry Heat Trend'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={industryTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="heat" 
                        stroke="#f97316" 
                        strokeWidth={2}
                        dot={{ fill: '#f97316', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Competitor Radar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{isZh ? '竞品雷达图' : 'Competitor Radar'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name={isZh ? '我的品牌' : 'My Brand'} dataKey="myBrand" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                      <Radar name={isZh ? '竞品均值' : 'Competitor Avg'} dataKey="competitor" stroke="#6b7280" fill="#6b7280" fillOpacity={0.2} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section 2: Consumer Insights */}
          <div className="mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-orange-500" />
              {isZh ? '消费者洞察' : 'Consumer Insights'}
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Demographics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{isZh ? '年龄分布' : 'Demographics'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={demographicsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
                      <YAxis dataKey="age" type="category" tick={{ fontSize: 12 }} width={50} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="percentage" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Demand Matrix */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{isZh ? '需求矩阵' : 'Demand Matrix'}</CardTitle>
                  <CardDescription className="text-xs">
                    {isZh ? 'X轴: 满足度 | Y轴: 重要性' : 'X: Satisfaction | Y: Importance'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <ZAxis type="number" dataKey="z" range={[60, 200]} />
                      <Tooltip 
                        formatter={(value, name) => [value, name === 'x' ? (isZh ? '满足度' : 'Satisfaction') : (isZh ? '重要性' : 'Importance')]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                      />
                      <Scatter data={demandMatrixData}>
                        {demandMatrixData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.quadrant === 1 ? '#22c55e' : entry.quadrant === 2 ? '#f97316' : entry.quadrant === 3 ? '#6b7280' : '#3b82f6'} 
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section 3: Brand Health */}
          <div className="mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Target className="h-5 w-5 text-orange-500" />
              {isZh ? '品牌健康' : 'Brand Health'}
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* SEO Dashboard */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{isZh ? 'SEO 仪表盘' : 'SEO Dashboard'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-orange-50 p-3 text-center dark:bg-orange-950/30">
                      <div className="text-xl font-bold text-orange-600">12</div>
                      <div className="text-xs text-muted-foreground">{isZh ? 'TOP 1-3 关键词' : 'TOP 1-3 Keywords'}</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-950/30">
                      <div className="text-xl font-bold text-blue-600">36.1K</div>
                      <div className="text-xs text-muted-foreground">{isZh ? '流量价值' : 'Traffic Value'}</div>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-950/30">
                      <div className="text-xl font-bold text-green-600">+18%</div>
                      <div className="text-xs text-muted-foreground">{isZh ? '周环比增长' : 'WoW Growth'}</div>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-950/30">
                      <div className="text-xl font-bold text-purple-600">89</div>
                      <div className="text-xs text-muted-foreground">{isZh ? '关键词总数' : 'Total Keywords'}</div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={seoKeywordsData}>
                      <XAxis dataKey="keyword" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="traffic" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Content Audit */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{isZh ? '内容审计' : 'Content Audit'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {contentAuditData.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{item.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {item.type}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.interactions.toLocaleString()} {isZh ? '互动' : 'interactions'}
                          </div>
                        </div>
                        <Badge 
                          variant={item.risk === 'high' ? 'destructive' : item.risk === 'medium' ? 'secondary' : 'outline'}
                          className="ml-2 shrink-0 text-xs"
                        >
                          {item.risk === 'high' ? (isZh ? '高风险' : 'High') : item.risk === 'medium' ? (isZh ? '中风险' : 'Med') : (isZh ? '低风险' : 'Low')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section 4: Strategy */}
          <div className="mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5 text-orange-500" />
              {isZh ? '策略建议' : 'Strategy Recommendations'}
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* SWOT Analysis */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{isZh ? 'SWOT 分析' : 'SWOT Analysis'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                      <div className="mb-2 text-sm font-semibold text-green-700 dark:text-green-400">
                        {isZh ? '优势 Strengths' : 'Strengths'}
                      </div>
                      <ul className="space-y-1 text-xs text-green-600 dark:text-green-300">
                        <li>• {isZh ? '用户互动率高' : 'High user engagement'}</li>
                        <li>• {isZh ? '内容质量优秀' : 'Excellent content quality'}</li>
                      </ul>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
                      <div className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
                        {isZh ? '劣势 Weaknesses' : 'Weaknesses'}
                      </div>
                      <ul className="space-y-1 text-xs text-red-600 dark:text-red-300">
                        <li>• {isZh ? 'SEO覆盖不足' : 'Insufficient SEO coverage'}</li>
                        <li>• {isZh ? '更新频率偏低' : 'Low update frequency'}</li>
                      </ul>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950/30">
                      <div className="mb-2 text-sm font-semibold text-orange-700 dark:text-orange-400">
                        {isZh ? '机会 Opportunities' : 'Opportunities'}
                      </div>
                      <ul className="space-y-1 text-xs text-orange-600 dark:text-orange-300">
                        <li>• {isZh ? '行业热度上升' : 'Rising industry heat'}</li>
                        <li>• {isZh ? '年轻用户增长' : 'Young user growth'}</li>
                      </ul>
                    </div>
                    <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/30">
                      <div className="mb-2 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                        {isZh ? '威胁 Threats' : 'Threats'}
                      </div>
                      <ul className="space-y-1 text-xs text-yellow-600 dark:text-yellow-300">
                        <li>• {isZh ? '竞品SEO强势' : 'Strong competitor SEO'}</li>
                        <li>• {isZh ? '市场竞争加剧' : 'Intensifying competition'}</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Plan */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{isZh ? '行动计划' : 'Action Plan'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-2 text-left font-medium text-muted-foreground">{isZh ? '周期' : 'Period'}</th>
                          <th className="pb-2 text-left font-medium text-muted-foreground">SEO</th>
                          <th className="pb-2 text-left font-medium text-muted-foreground">{isZh ? '社交' : 'Social'}</th>
                          <th className="pb-2 text-left font-medium text-muted-foreground">{isZh ? '运营' : 'Ops'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actionPlanData.map((row, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2 font-medium text-orange-600">{row.period}</td>
                            <td className="py-2 text-muted-foreground">{row.seo}</td>
                            <td className="py-2 text-muted-foreground">{row.social}</td>
                            <td className="py-2 text-muted-foreground">{row.operation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer: Data Sources */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{isZh ? '数据来源与可追溯性' : 'Data Sources & Traceability'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  <span>TikTok Analytics API</span>
                </div>
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  <span>Google Search Console</span>
                </div>
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  <span>SEMrush Data Export</span>
                </div>
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  <span>Internal CRM Data</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground/70">
                {isZh ? '数据更新时间：2024年1月16日 08:00 UTC | 数据保留期：90天' : 'Data updated: Jan 16, 2024 08:00 UTC | Retention: 90 days'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}