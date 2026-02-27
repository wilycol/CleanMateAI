import { SectionTitle } from '@/components/SectionTitle';
import { FeatureCard } from '@/components/FeatureCard';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Brain, Activity, ShieldCheck, Sparkles, Gauge, Lock } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Inteligencia Nativa',
    description:
      'No son scripts simples. CleanMate AI utiliza algoritmos de aprendizaje para entender los patrones de uso de tu PC y optimizar recursos.',
    variant: 'highlighted' as const,
  },
  {
    icon: Activity,
    title: 'Diagnóstico Profundo',
    description:
      'Analiza la salud del sistema en tiempo real (CPU, RAM, Disco) y toma decisiones autónomas para prevenir cuellos de botella.',
    variant: 'default' as const,
  },
  {
    icon: ShieldCheck,
    title: 'Integridad Garantizada',
    description:
      'Cada decisión de limpieza es validada. El modo Safe-Core asegura que tus archivos críticos nunca sean tocados.',
    variant: 'default' as const,
  },
  {
    icon: Sparkles,
    title: 'Optimización Automática',
    description:
      'Deja que la IA haga el trabajo pesado. CleanMate AI aprende de tus hábitos y optimiza tu sistema automáticamente.',
    variant: 'default' as const,
  },
  {
    icon: Gauge,
    title: 'Monitoreo en Tiempo Real',
    description:
      'Visualiza el rendimiento de tu sistema con métricas claras y actualizadas al instante.',
    variant: 'default' as const,
  },
  {
    icon: Lock,
    title: 'Sin Riesgos',
    description:
      'Sin procesos ocultos. Sin adware. Sin riesgos innecesarios. Tu privacidad y seguridad son nuestra prioridad.',
    variant: 'default' as const,
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fade-up">
          <SectionTitle
            subtitle="Características"
            title="Todo lo que necesitas para"
            highlight="optimizar tu PC"
            description="CleanMate AI combina inteligencia artificial con herramientas potentes para mantener tu sistema en óptimas condiciones."
          />
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <AnimatedSection
              key={index}
              animation="fade-up"
              delay={index * 100}
              duration={600}
            >
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                variant={feature.variant}
              />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
