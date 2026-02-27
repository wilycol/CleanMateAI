import { SectionTitle } from '@/components/SectionTitle';
import { StepCard } from '@/components/StepCard';
import { Download, Settings, Rocket } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Download,
    title: 'Descarga e Instala',
    description:
      'Descarga CleanMate AI desde nuestro repositorio oficial e instálalo en tu PC con Windows 10/11.',
  },
  {
    number: 2,
    icon: Settings,
    title: 'Configura tu Perfil',
    description:
      'La IA analizará automáticamente tu sistema y aprenderá tus patrones de uso para optimizar eficientemente.',
  },
  {
    number: 3,
    icon: Rocket,
    title: 'Disfruta el Rendimiento',
    description:
      'Tu PC funcionará de manera más fluida y eficiente, con monitoreo continuo y optimización automática.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          subtitle="Cómo Funciona"
          title="Tres pasos simples para"
          highlight="optimizar tu PC"
          description="Comenzar con CleanMate AI es fácil. Sigue estos pasos y deja que la inteligencia artificial haga el resto."
        />

        <div className="grid md:grid-cols-3 gap-12 md:gap-8 mt-16">
          {steps.map((step, index) => (
            <StepCard
              key={index}
              number={step.number}
              icon={step.icon}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>

        {/* Progress Line (Desktop) */}
        <div className="hidden md:block relative mt-8">
          <div className="absolute top-0 left-[16.67%] right-[16.67%] h-0.5 bg-border">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
            <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
