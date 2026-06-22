import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '@/services/api';

type Category = { id: number; name: string; slug: string };
type Item = Category & { image: string | null };

// Slider de categorias arrastável (inspirado no "image track" de Camille Mormal),
// adaptado: eventos escopados ao próprio slider (não sequestram a página) e
// cada imagem leva para a listagem filtrada da categoria.
export function CategoryTrack({ categories }: { categories: Category[] }) {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  // Estado do arraste guardado em refs (não dispara re-render)
  const mouseDownAt = useRef(0);
  const prevPercentage = useRef(0);
  const percentage = useRef(0);
  const arrastou = useRef(false);

  // Resolve uma imagem representativa por categoria (1 produto de cada)
  useEffect(() => {
    if (categories.length === 0) return;
    Promise.all(
      categories.map(c =>
        api.get(`/products?category=${c.id}&limit=1`)
          .then(r => r.data.data.products?.[0]?.product_images?.[0]?.url ?? null)
          .catch(() => null)
      )
    ).then(imgs => {
      setItems(categories.map((c, i) => ({ ...c, image: imgs[i] })));
    });
  }, [categories]);

  function aplicar(pct: number) {
    const track = trackRef.current;
    if (!track) return;
    track.animate({ transform: `translateX(${pct}%)` }, { duration: 1000, fill: 'forwards' });
    for (const img of Array.from(track.querySelectorAll('img'))) {
      img.animate({ objectPosition: `${100 + pct}% center` }, { duration: 1000, fill: 'forwards' });
    }
  }

  function onDown(clientX: number) {
    mouseDownAt.current = clientX;
    arrastou.current = false;
  }
  function onMove(clientX: number) {
    if (mouseDownAt.current === 0) return;
    const delta = mouseDownAt.current - clientX;
    if (Math.abs(delta) > 4) arrastou.current = true;
    const maxDelta = window.innerWidth / 2;
    const pctMov = (delta / maxDelta) * -100;
    const next = Math.max(Math.min(prevPercentage.current + pctMov, 0), -100);
    percentage.current = next;
    aplicar(next);
  }
  function onUp() {
    if (mouseDownAt.current === 0) return;
    mouseDownAt.current = 0;
    prevPercentage.current = percentage.current;
  }

  // Listeners de move/up no documento APENAS enquanto arrasta
  function iniciarArraste(clientX: number) {
    onDown(clientX);
    const move = (e: PointerEvent) => onMove(e.clientX);
    const up = () => {
      onUp();
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  if (items.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight">Categorias</h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:block">arraste →</span>
        </div>
      </div>

      {/* Faixa do slider — overflow escondido, arraste escopado */}
      <div
        className="overflow-hidden px-4 select-none cursor-grab active:cursor-grabbing"
        onPointerDown={e => iniciarArraste(e.clientX)}
      >
        <div ref={trackRef} className="flex gap-[2vmin] w-max will-change-transform">
          {items.map(c => (
            <button
              key={c.id}
              onClick={() => { if (!arrastou.current) navigate(`/produtos?categoria=${c.slug}`); }}
              className="group relative shrink-0 overflow-hidden bg-secondary h-[58vmin] max-h-[440px] w-[42vmin] max-w-[320px]"
            >
              {c.image ? (
                <img
                  src={c.image}
                  alt={c.name}
                  draggable={false}
                  className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-500"
                  style={{ objectPosition: '100% center' }}
                />
              ) : (
                <div className="h-full w-full bg-secondary" />
              )}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition flex items-end p-5">
                <span className="font-display text-lg sm:text-xl font-bold uppercase tracking-wide text-white">{c.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
