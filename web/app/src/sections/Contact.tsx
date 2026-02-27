import { SectionTitle } from '@/components/SectionTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageSquare, ExternalLink } from 'lucide-react';

export function Contact() {
  return (
    <section id="contact" className="py-20 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          subtitle="Contacto"
          title="¿Tienes preguntas?"
          highlight="Escríbenos"
          description="Estamos aquí para ayudarte. Contáctanos a través de cualquiera de nuestros canales."
        />

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-card rounded-2xl p-8 border border-border">
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Información de Contacto
              </h3>
              
              <div className="space-y-6">
                <a
                  href="https://wilycol.github.io/wily-dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <ExternalLink className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Sitio del Desarrollador</h4>
                    <p className="text-muted-foreground text-sm">wilycol.github.io/wily-dev</p>
                  </div>
                </a>

                <a
                  href="https://github.com/wilycol/CleanMateAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">GitHub</h4>
                    <p className="text-muted-foreground text-sm">github.com/wilycol/CleanMateAI</p>
                  </div>
                </a>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Soporte</h4>
                    <p className="text-muted-foreground text-sm">A través de GitHub Issues</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-primary/5 rounded-2xl p-8 border border-primary/20">
              <h4 className="font-semibold text-foreground mb-4">Enlaces Rápidos</h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://github.com/wilycol/CleanMateAI/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Releases
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://wilycol.github.io/CleanMateAI/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    App Original
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://wilycol.github.io/wily-dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Willy Dev's
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card rounded-2xl p-8 border border-border">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Envíanos un mensaje
            </h3>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre
                  </label>
                  <Input placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <Input type="email" placeholder="tu@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Asunto
                </label>
                <Input placeholder="¿De qué se trata?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mensaje
                </label>
                <Textarea
                  placeholder="Escribe tu mensaje aquí..."
                  rows={5}
                />
              </div>
              <Button type="submit" className="w-full">
                Enviar Mensaje
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
