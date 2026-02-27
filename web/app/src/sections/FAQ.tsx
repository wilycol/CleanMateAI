import { SectionTitle } from '@/components/SectionTitle';
import { FAQItem } from '@/components/FAQItem';

const faqs = [
  {
    question: '¿Es seguro usar CleanMate AI?',
    answer:
      'Sí, CleanMate AI es completamente seguro. Utilizamos el modo Safe-Core que valida cada decisión de limpieza y asegura que tus archivos críticos del sistema nunca sean modificados. Además, no contiene adware ni procesos ocultos.',
  },
  {
    question: '¿Qué versiones de Windows son compatibles?',
    answer:
      'CleanMate AI es compatible con Windows 10 y Windows 11. Recomendamos tener la última versión de actualizaciones de Windows instalada para un rendimiento óptimo.',
  },
  {
    question: '¿Cómo funciona la inteligencia artificial?',
    answer:
      'CleanMate AI utiliza algoritmos de aprendizaje que analizan los patrones de uso de tu PC. Con el tiempo, la IA entiende qué aplicaciones usas más, cuándo tu sistema necesita optimización y toma decisiones autónomas para mantener el rendimiento.',
  },
  {
    question: '¿Puedo desinstalarlo si no me gusta?',
    answer:
      'Por supuesto. CleanMate AI puede desinstalarse completamente desde el Panel de Control de Windows o Configuración > Aplicaciones. No deja rastros ni archivos residuales.',
  },
  {
    question: '¿Es gratuito?',
    answer:
      'Sí, la versión MVP actual es completamente gratuita. Estamos trabajando en características premium para futuras versiones, pero la funcionalidad básica siempre será gratuita.',
  },
  {
    question: '¿Dónde puedo reportar problemas o sugerencias?',
    answer:
      'Puedes reportar problemas o enviar sugerencias a través de nuestro repositorio de GitHub. También puedes contactarnos directamente desde nuestra página de desarrollador.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          subtitle="Preguntas Frecuentes"
          title="Todo lo que necesitas"
          highlight="saber"
          description="Encuentra respuestas a las preguntas más comunes sobre CleanMate AI."
        />

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
