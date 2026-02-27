import { SectionTitle } from '@/components/SectionTitle';
import { StatCard } from '@/components/StatCard';
import { AnimatedSection } from '@/components/AnimatedSection';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const benefits = [
  'Algoritmos de aprendizaje para entender patrones de uso',
  'Análisis de salud del sistema en tiempo real',
  'Decisiones autónomas para prevenir cuellos de botella',
  'Modo Safe-Core para proteger archivos críticos',
];

const stats = [
  { value: '1.0', label: 'Versión Actual', suffix: '' },
  { value: '100', label: 'Descargas', suffix: '+' },
  { value: '24/7', label: 'Soporte IA', suffix: '' },
];

export function About() {
  return (
    <section id="about" className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div>
            <AnimatedSection animation="fade-right">
              <SectionTitle
                subtitle="Sobre CleanMate AI"
                title="¿Por qué elegir"
                highlight="nuestra solución?"
                align="left"
                className="mb-8"
              />
            </AnimatedSection>
            
            <AnimatedSection animation="fade-right" delay={100}>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                CleanMate AI es una aplicación de optimización inteligente que utiliza
                algoritmos de aprendizaje para entender los patrones de uso de tu PC
                y optimizar recursos de manera autónoma.
              </p>
            </AnimatedSection>
            
            <AnimatedSection animation="fade-right" delay={200}>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Desarrollada por Willy Dev's, un estudio independiente enfocado en
                herramientas impulsadas por IA y productos experimentales. Sin hype,
                sin vaporware — solo trabajo enviado y experimentos honestos.
              </p>
            </AnimatedSection>

            {/* Benefits List */}
            <ul className="space-y-4 mb-10">
              {benefits.map((benefit, index) => (
                <AnimatedSection key={index} animation="fade-right" delay={300 + index * 100}>
                  <li className="flex items-start gap-3 group">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                </AnimatedSection>
              ))}
            </ul>

            {/* Developer Link */}
            <AnimatedSection animation="fade-right" delay={700}>
              <a
                href="https://wilycol.github.io/wily-dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium group"
              >
                Conoce al desarrollador
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </AnimatedSection>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat, index) => (
              <AnimatedSection
                key={index}
                animation="zoom-in"
                delay={index * 150}
                className={index === 2 ? 'col-span-2' : ''}
              >
                <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                  <StatCard value={stat.value} label={stat.label} suffix={stat.suffix} />
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
