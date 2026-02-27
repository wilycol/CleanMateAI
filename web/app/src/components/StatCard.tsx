import { cn } from '@/lib/utils';

interface StatCardProps {
  value: string;
  label: string;
  suffix?: string;
  className?: string;
}

export function StatCard({ value, label, suffix = '+', className }: StatCardProps) {
  return (
    <div className={cn('text-center', className)}>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-4xl md:text-5xl font-bold text-primary">{value}</span>
        <span className="text-2xl md:text-3xl font-bold text-primary">{suffix}</span>
      </div>
      <p className="text-muted-foreground mt-2">{label}</p>
    </div>
  );
}
