import { Sparkles, Github, ExternalLink, Heart } from 'lucide-react';

const footerLinks = {
  producto: [
    { label: 'Descargar', href: 'https://github.com/wilycol/CleanMateAI/releases/download/v1.0.3/CleanMate.AI.Setup.1.0.3.exe' },
    { label: 'Características', href: '#features' },
    { label: 'Cómo Funciona', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
  ],
  recursos: [
    { label: 'GitHub', href: 'https://github.com/wilycol/CleanMateAI' },
    { label: 'Releases', href: 'https://github.com/wilycol/CleanMateAI/releases' },
    { label: 'Issues', href: 'https://github.com/wilycol/CleanMateAI/issues' },
  ],
  desarrollador: [
    { label: 'Willy Dev\'s', href: 'https://wilycol.github.io/wily-dev/' },
    { label: 'LinkedIn', href: '#' },
    { label: 'GitHub', href: 'https://github.com/wilycol' },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="#home" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">CleanMate AI</span>
            </a>
            <p className="text-muted-foreground mb-6">
              Optimización inteligente y asistida para Windows. Potenciado por Groq AI.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/wilycol/CleanMateAI"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://wilycol.github.io/wily-dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Producto</h4>
            <ul className="space-y-3">
              {footerLinks.producto.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Recursos</h4>
            <ul className="space-y-3">
              {footerLinks.recursos.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Desarrollador</h4>
            <ul className="space-y-3">
              {footerLinks.desarrollador.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm text-center md:text-left">
            © {currentYear} CleanMate AI. Desarrollado por{' '}
            <a
              href="https://wilycol.github.io/wily-dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Willy Dev's
            </a>
          </p>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            Hecho con <Heart className="w-4 h-4 text-red-500 fill-red-500" /> y Groq AI
          </p>
        </div>
      </div>
    </footer>
  );
}
