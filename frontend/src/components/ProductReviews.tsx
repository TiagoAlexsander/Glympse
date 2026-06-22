import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type Review = {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  verified_purchase: boolean;
  owner_reply: string | null;
  owner_reply_at: string | null;
  created_at: string;
  author: string;
  avatar_url: string | null;
  images: string[];
};

type Stats = { total: number; avg_rating: number };

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  return (
    <span className={`inline-flex gap-0.5 ${size === 'lg' ? 'text-xl' : 'text-sm'}`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={n <= rating ? 'text-yellow-400' : 'text-stone-200'}>★</span>
      ))}
    </span>
  );
}

export function ProductReviews({ productId }: { productId: number }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats,   setStats]   = useState<Stats>({ total: 0, avg_rating: 0 });
  const [loading, setLoading] = useState(true);

  // Formulário de review
  const [showForm,   setShowForm]   = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formTitle,  setFormTitle]  = useState('');
  const [formBody,   setFormBody]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  async function loadReviews() {
    setLoading(true);
    try {
      const res = await api.get(`/reviews?product_id=${productId}`);
      setReviews(res.data.data.reviews ?? []);
      setStats(res.data.data.stats ?? { total: 0, avg_rating: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReviews(); }, [productId]);

  async function enviarReview() {
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        product_id: productId,
        rating:     formRating,
        title:      formTitle || undefined,
        body:       formBody  || undefined,
      });
      setSubmitted(true);
      setShowForm(false);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao enviar avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Avaliações
            {stats.total > 0 && (
              <span className="ml-2 text-base font-normal text-stone-400">({stats.total})</span>
            )}
          </h2>
          {stats.total > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Stars rating={Math.round(stats.avg_rating)} size="lg" />
              <span className="text-sm font-semibold text-stone-900">{stats.avg_rating.toFixed(1)}</span>
              <span className="text-xs text-stone-400">de 5</span>
            </div>
          )}
        </div>

        {user && !submitted && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
          >
            {showForm ? 'Cancelar' : 'Avaliar produto'}
          </button>
        )}
      </div>

      {/* Aviso de review enviado */}
      {submitted && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          ✅ Avaliação enviada! Será publicada após aprovação.
        </div>
      )}

      {/* Formulário de review */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-stone-900">Sua avaliação</p>

          {/* Seletor de estrelas */}
          <div>
            <p className="text-xs text-stone-500 mb-1">Nota</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setFormRating(n)}
                  className={`text-2xl transition ${n <= formRating ? 'text-yellow-400' : 'text-stone-200 hover:text-yellow-300'}`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-sm text-stone-500 self-center">
                {['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'][formRating]}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Título (opcional)</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Resumo da sua avaliação"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
          </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Comentário (opcional)</label>
            <textarea
              value={formBody}
              onChange={e => setFormBody(e.target.value)}
              rows={3}
              placeholder="Conte sua experiência com o produto..."
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 resize-none"
            />
          </div>

          <button
            onClick={enviarReview}
            disabled={submitting}
            className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Enviando...' : 'Publicar avaliação'}
          </button>
        </div>
      )}

      {/* Lista de reviews */}
      {loading ? (
        <p className="text-stone-400 text-sm py-4">Carregando avaliações...</p>
      ) : reviews.length === 0 ? (
        <p className="text-stone-400 text-sm py-4">
          Nenhuma avaliação ainda.{user ? ' Seja o primeiro a avaliar!' : ' Faça login para avaliar.'}
        </p>
      ) : (
        <div className="space-y-5">
          {reviews.map(review => (
            <div key={review.id} className="border-b border-stone-100 pb-5 last:border-0">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0 text-xs font-semibold text-stone-600">
                  {review.avatar_url
                    ? <img src={review.avatar_url} className="h-8 w-8 rounded-full object-cover" />
                    : review.author.charAt(0).toUpperCase()
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-900">{review.author}</span>
                    {review.verified_purchase && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                        ✓ Compra verificada
                      </span>
                    )}
                    <span className="text-xs text-stone-400">
                      {new Date(review.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <Stars rating={review.rating} />

                  {review.title && (
                    <p className="mt-1 text-sm font-semibold text-stone-900">{review.title}</p>
                  )}
                  {review.body && (
                    <p className="mt-1 text-sm text-stone-600 leading-relaxed">{review.body}</p>
                  )}

                  {/* Imagens do review */}
                  {review.images.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {review.images.map((url, i) => (
                        <img key={i} src={url} alt="" className="h-16 w-16 rounded-lg object-cover bg-stone-100" />
                      ))}
                    </div>
                  )}

                  {/* Resposta do dono */}
                  {review.owner_reply && (
                    <div className="mt-3 rounded-lg bg-stone-50 border border-stone-100 px-4 py-3">
                      <p className="text-xs font-semibold text-stone-700 mb-1">Resposta da Glympse</p>
                      <p className="text-xs text-stone-600">{review.owner_reply}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
