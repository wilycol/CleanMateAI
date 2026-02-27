import { Download, ArrowRight, Cpu, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedSection } from '@/components/AnimatedSection';

export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-20 overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background dark:from-primary/10" />
      
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse delay-500" />
        
        {/* Animated Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Floating Particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/30 rounded-full animate-bounce"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo Animation */}
          <AnimatedSection animation="zoom-in" duration={800}>
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <img
                  src="/favicon.png"
                  alt="CleanMate AI"
                  className="w-20 h-20 md:w-24 md:h-24 animate-float"
                />
                {/* Glow Effect */}
                <div className="absolute inset-0 w-20 h-20 md:w-24 md:h-24 bg-primary/30 rounded-full blur-xl animate-pulse" />
              </div>
            </div>
          </AnimatedSection>

          {/* Badge */}
          <AnimatedSection animation="fade-up" delay={200} duration={600}>
            <Badge
              variant="secondary"
              className="mb-6 px-4 py-2 text-sm font-medium inline-flex items-center gap-2 hover:scale-105 transition-transform cursor-default"
            >
              <Zap className="w-4 h-4 text-primary animate-pulse" />
              Potenciado por Groq AI
            </Badge>
          </AnimatedSection>

          {/* Title */}
          <AnimatedSection animation="fade-up" delay={300} duration={600}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Optimización{' '}
              <span className="text-primary bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Inteligente
              </span>{' '}
              para Windows
            </h1>
          </AnimatedSection>

          {/* Description */}
          <AnimatedSection animation="fade-up" delay={400} duration={600}>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Monitorea CPU, RAM y Disco en tiempo real. Recibe recomendaciones claras
              basadas en métricas reales del sistema. Sin procesos ocultos. Sin adware.
              Sin riesgos innecesarios.
            </p>
          </AnimatedSection>

          {/* CTA Buttons */}
          <AnimatedSection animation="fade-up" delay={500} duration={600}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 py-6 text-lg group relative overflow-hidden"
                asChild
              >
                <a
                  href="https://github.com/wilycol/CleanMateAI/releases/download/v1.0.3/CleanMate.AI.Setup.1.0.3.exe"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                  Descargar versión MVP
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 py-6 text-lg group hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                asChild
              >
                <a href="#features">
                  Ver Características
                  <ArrowRight className="w-5 h-5 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
              </Button>
            </div>
          </AnimatedSection>

          {/* Version Info */}
          <AnimatedSection animation="fade-up" delay={600} duration={600}>
            <p className="text-sm text-muted-foreground mb-16">
              Versión 1.0.3 | Compatible con Windows 10/11
            </p>
          </AnimatedSection>

          {/* Feature Pills */}
          <AnimatedSection animation="fade-up" delay={700} duration={600}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { icon: Cpu, text: 'Monitoreo en Tiempo Real' },
                { icon: Zap, text: 'IA Nativa' },
                { icon: Shield, text: '100% Seguro' },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
                >
                  <feature.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-border flex items-start justify-center p-2 hover:border-primary transition-colors cursor-pointer">
          <div className="w-1.5 h-3 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
