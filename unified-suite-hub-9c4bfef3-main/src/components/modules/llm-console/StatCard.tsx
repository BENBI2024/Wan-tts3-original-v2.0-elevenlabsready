import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: ReactNode;
  iconBg?: string;
  label: string;
  value: string | number;
  subLabel?: string;
  subValue?: string | number;
  action?: ReactNode;
}

export function StatCard({
  icon,
  iconBg = 'bg-muted',
  label,
  value,
  subLabel,
  subValue,
  action,
}: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('stat-card-icon', iconBg)}>{icon}</div>
        {action}
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="stat-card-label">{label}</p>
          <p className="stat-card-value">{value}</p>
        </div>
        
        {subLabel && (
          <div>
            <p className="stat-card-label">{subLabel}</p>
            <p className="text-lg font-semibold text-foreground">{subValue}</p>
          </div>
        )}
      </div>
    </div>
  );
}
