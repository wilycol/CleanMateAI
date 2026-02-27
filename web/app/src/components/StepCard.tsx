import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepCardProps {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function StepCard({ number, icon: Icon, title, description, className }: StepCardProps) {
  return (
    <div className={cn('relative text-center group', className)}>
      {/* Step Number */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold z-10">
        {number}
      </div>
      
      {/* Icon Container */}
      <div className="w-20 h-20 mx-auto rounded-full bg-card border-2 border-primary/20 flex items-center justify-center mb-4 transition-all duration-300 group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/20">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      
      {/* Content */}
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-xs mx-auto">{description}</p>
    </div>
  );
}
