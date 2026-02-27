import { useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const screenshots = [
  {
    id: 1,
    src: '/images/dashboard.png',
    title: 'Dashboard Principal',
    description: 'Monitoreo en tiempo real de CPU, RAM y Disco con indicadores visuales claros.',
  },
  {
    id: 2,
    src: '/images/chat-ia.png',
    title: 'CleanMate Copilot',
    description: 'Asistente de IA que guía el análisis y optimización del sistema paso a paso.',
  },
  {
    id: 3,
    src: '/images/reports.png',
    title: 'Historial de Reportes',
    description: 'Registro completo de limpiezas y análisis con detalles de espacio liberado.',
  },
];

export function Screenshots() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % screenshots.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <section id="screenshots" className="py-20 md:py-32 bg-muted/50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          subtitle="Interfaz de la App"
          title="Conoce CleanMate AI"
          highlight="por dentro"
          description="Explora la interfaz intuitiva y potente de CleanMate AI diseñada para una experiencia de usuario excepcional."
        />

        {/* Main Carousel */}
        <div className="relative max-w-5xl mx-auto">
          {/* Main Image */}
          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl bg-card border border-border">
            {screenshots.map((screenshot, index) => (
              <div
                key={screenshot.id}
                className={cn(
                  'absolute inset-0 transition-all duration-500 ease-in-out',
                  index === activeIndex
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-95'
                )}
              >
                <img
                  src={screenshot.src}
                  alt={screenshot.title}
                  className="w-full h-full object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Expand Button */}
                <button
                  onClick={() => openLightbox(index)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>

                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-xl font-bold mb-2">{screenshot.title}</h3>
                  <p className="text-white/80 text-sm">{screenshot.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Thumbnails */}
          <div className="flex justify-center gap-4 mt-8">
            {screenshots.map((screenshot, index) => (
              <button
                key={screenshot.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'relative w-24 h-16 md:w-32 md:h-20 rounded-lg overflow-hidden transition-all duration-300',
                  index === activeIndex
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                )}
              >
                <img
                  src={screenshot.src}
                  alt={screenshot.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  index === activeIndex
                    ? 'w-8 bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          {[
            { icon: '🖥️', title: 'Dashboard Intuitivo', desc: 'Visualización clara de métricas del sistema' },
            { icon: '🤖', title: 'IA Asistente', desc: 'CleanMate Copilot te guía paso a paso' },
            { icon: '📊', title: 'Reportes Detallados', desc: 'Historial completo de optimizaciones' },
          ].map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <img
            src={screenshots[activeIndex].src}
            alt={screenshots[activeIndex].title}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-center">
            <h3 className="text-lg font-semibold">{screenshots[activeIndex].title}</h3>
            <p className="text-white/70 text-sm">{screenshots[activeIndex].description}</p>
          </div>
        </div>
      )}
    </section>
  );
}
