export type ModuleType = 'geo-insights' | 'llm-console' | 'ai-toolbox';

export interface ModuleConfig {
  id: ModuleType;
  name: string;
  description: string;
  icon: string;
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'geo-insights',
    name: 'GEO Insights',
    description: 'Analytics & Brand Audit',
    icon: 'BarChart3',
  },
  {
    id: 'ai-toolbox',
    name: 'AI Toolbox',
    description: 'Image/Video Generation',
    icon: 'Wand2',
  },
  {
    id: 'llm-console',
    name: 'LLM Console',
    description: 'Model Management & Chat',
    icon: 'MessageSquare',
  },
];
