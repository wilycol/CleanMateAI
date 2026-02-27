import { Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
  className?: string;
}

export function TestimonialCard({
  quote,
  author,
  role,
  avatar,
  className,
}: TestimonialCardProps) {
  return (
    <div
      className={cn(
        'relative p-6 md:p-8 rounded-2xl bg-card border border-border transition-all duration-300 hover:shadow-lg',
        className
      )}
    >
      <Quote className="w-10 h-10 text-primary/20 mb-4" />
      <p className="text-foreground leading-relaxed mb-6">{quote}</p>
      <div className="flex items-center gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt={author}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold text-lg">
              {author.charAt(0)}
            </span>
          </div>
        )}
        <div>
          <h4 className="font-semibold text-foreground">{author}</h4>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  );
}
