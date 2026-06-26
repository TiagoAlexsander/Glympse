import { Link } from 'wouter';
import { formatarReal } from '@/utils';

type ProductCardProps = {
  slug: string;
  name: string;
  basePrice: number;
  comparePrice?: number | null;
  category?: string | null;
  image?: string | null;
  imageAlt?: string;
  isFeatured?: boolean;
  lowStock?: boolean;
  outOfStock?: boolean;
};

// Card de produto no estilo do tema (minimalista, hover com escala, tipografia Syncopate)
export function ProductCard({
  slug, name, basePrice, comparePrice, category, image, imageAlt, isFeatured, lowStock, outOfStock,
}: ProductCardProps) {
  const desconto = comparePrice && comparePrice > basePrice
    ? Math.round((1 - basePrice / comparePrice) * 100)
    : null;

  return (
    <Link href={`/products/${slug}`}>
      <div className="group relative cursor-pointer">
        {/* Imagem */}
        <div className="relative aspect-[3/4] bg-secondary overflow-hidden mb-3 border border-border group-hover:border-foreground transition-colors">
          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            {outOfStock ? (
              <span className="bg-foreground/70 text-background text-[10px] px-2 py-1 font-bold uppercase tracking-widest backdrop-blur-sm">
                Esgotado
              </span>
            ) : lowStock ? (
              <span className="bg-amber-500 text-black text-[10px] px-2 py-1 font-bold uppercase tracking-widest">
                Últimas unidades
              </span>
            ) : null}
            {isFeatured && !outOfStock && (
              <span className="bg-foreground text-background text-[10px] px-2 py-1 font-bold uppercase tracking-widest">
                Destaque
              </span>
            )}
            {desconto && (
              <span className="bg-destructive text-destructive-foreground text-[10px] px-2 py-1 font-bold uppercase tracking-widest">
                -{desconto}%
              </span>
            )}
          </div>

          {image ? (
            <img
              src={image}
              alt={imageAlt ?? name}
              loading="lazy"
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">
              sem foto
            </div>
          )}

          {/* Faixa "Ver produto" que sobe no hover */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-background/90 backdrop-blur-sm p-3">
            <div className="w-full bg-foreground text-background text-center text-[11px] uppercase tracking-widest font-bold py-2.5">
              Ver produto
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1">
          {category && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{category}</p>
          )}
          <h3 className="font-display font-bold text-xs uppercase tracking-wide leading-tight line-clamp-2 group-hover:underline decoration-1 underline-offset-4">
            {name}
          </h3>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="font-mono text-sm">{formatarReal(basePrice)}</span>
            {desconto && (
              <span className="font-mono text-xs text-muted-foreground line-through">{formatarReal(comparePrice!)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
