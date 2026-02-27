import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Inicio', href: '#home' },
  { label: 'Sobre', href: '#about' },
  { label: 'Características', href: '#features' },
  { label: 'Screenshots', href: '#screenshots' },
  { label: 'Cómo Funciona', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contacto', href: '#contact' },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-background/80 backdrop-blur-lg shadow-sm border-b border-border'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('#home');
            }}
            className="flex items-center gap-2 group"
          >
            <img
              src="/favicon.png"
              alt="CleanMate AI"
              className="w-10 h-10 rounded-xl transition-transform group-hover:scale-110"
            />
            <span className="text-xl font-bold text-foreground">CleanMate AI</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(link.href);
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              asChild
              className="hidden sm:inline-flex"
            >
              <a
                href="https://github.com/wilycol/CleanMateAI/releases/download/v1.0.3/CleanMate.AI.Setup.1.0.3.exe"
                target="_blank"
                rel="noopener noreferrer"
              >
                Descargar
              </a>
            </Button>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300',
          isMobileMenuOpen ? 'max-h-96' : 'max-h-0'
        )}
      >
        <div className="bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(link.href);
              }}
              className="block px-4 py-3 text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Button
            asChild
            className="w-full mt-4"
          >
            <a
              href="https://github.com/wilycol/CleanMateAI/releases/download/v1.0.3/CleanMate.AI.Setup.1.0.3.exe"
              target="_blank"
              rel="noopener noreferrer"
            >
              Descargar
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
