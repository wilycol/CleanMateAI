import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  variant?: 'default' | 'highlighted';
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  variant = 'default',
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        'group p-6 rounded-2xl transition-all duration-300',
        variant === 'default' && 'bg-card hover:shadow-lg border border-border',
        variant === 'highlighted' && 'bg-primary/5 hover:bg-primary/10 border border-primary/20',
        className
      )}
    >
      <div
        className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110',
          variant === 'default' && 'bg-primary/10 text-primary',
          variant === 'highlighted' && 'bg-primary text-primary-foreground'
        )}
      >
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
