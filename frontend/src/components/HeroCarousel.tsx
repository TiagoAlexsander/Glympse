import { useEffect, useState, useRef } from 'react';
import { Link } from 'wouter';

export type HeroSlide = {
  title: string;
  subtitle?: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
};

// Carrossel de destaque da home — autoavança, com setas e indicadores.
// Sem dependências externas (controle manual de slide).
export function HeroCarousel({ slides, interval = 5000 }: { slides: HeroSlide[]; interval?: number }) {
  const [atual, setAtual] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = slides.length;

  function irPara(i: number) { setAtual((i + total) % total); }

  // Autoavanço (pausa quando só há 1 slide)
  useEffect(() => {
    if (total <= 1) return;
    timer.current = setInterval(() => setAtual(a => (a + 1) % total), interval);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [total, interval]);

  if (total === 0) return null;

  return (
    <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden bg-secondary">
      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === atual ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
          {/* Overlay escuro para legibilidade */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            {s.subtitle && (
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-white/80">{s.subtitle}</p>
            )}
            <h2 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-white max-w-3xl">
              {s.title}
            </h2>
            <Link
              href={s.ctaHref}
              className="mt-8 bg-white px-8 py-3.5 text-[11px] font-bold uppercase tracking-widest text-black hover:bg-white/90 transition"
            >
              {s.ctaLabel}
            </Link>
          </div>
        </div>
      ))}

      {/* Setas */}
      {total > 1 && (
        <>
          <button
            onClick={() => irPara(atual - 1)}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => irPara(atual + 1)}
            aria-label="Próximo"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>

          {/* Indicadores */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => irPara(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 transition-all ${i === atual ? 'w-8 bg-white' : 'w-4 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
