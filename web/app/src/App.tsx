import { ThemeProvider } from '@/hooks/useTheme';
import { Header } from '@/sections/Header';
import { Hero } from '@/sections/Hero';
import { About } from '@/sections/About';
import { Features } from '@/sections/Features';
import { Screenshots } from '@/sections/Screenshots';
import { HowItWorks } from '@/sections/HowItWorks';
import { FAQ } from '@/sections/FAQ';
import { Testimonials } from '@/sections/Testimonials';
import { Contact } from '@/sections/Contact';
import { Footer } from '@/sections/Footer';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />
        <main>
          <Hero />
          <About />
          <Features />
          <Screenshots />
          <HowItWorks />
          <FAQ />
          <Testimonials />
          <Contact />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
