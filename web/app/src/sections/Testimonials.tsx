import { SectionTitle } from '@/components/SectionTitle';
import { TestimonialCard } from '@/components/TestimonialCard';

const testimonials = [
  {
    quote:
      'CleanMate AI ha transformado completamente la forma en que mantengo mi PC. La optimización automática es increíble y mi sistema nunca ha funcionado mejor.',
    author: 'Carlos Mendoza',
    role: 'Desarrollador de Software',
  },
  {
    quote:
      'Finalmente una herramienta de limpieza que realmente usa inteligencia artificial. Me encanta cómo aprende mis patrones de uso y optimiza sin interrumpir mi trabajo.',
    author: 'Ana García',
    role: 'Diseñadora Gráfica',
  },
  {
    quote:
      'El monitoreo en tiempo real me da tranquilidad. Puedo ver exactamente qué está pasando con mi sistema y la IA toma decisiones inteligentes automáticamente.',
    author: 'Luis Rodríguez',
    role: 'Ingeniero de Sistemas',
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          subtitle="Testimonios"
          title="Lo que dicen nuestros"
          highlight="usuarios"
          description="Descubre por qué miles de usuarios confían en CleanMate AI para mantener sus PCs optimizadas."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              quote={testimonial.quote}
              author={testimonial.author}
              role={testimonial.role}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
