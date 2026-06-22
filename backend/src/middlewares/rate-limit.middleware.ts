import rateLimit from 'express-rate-limit';

// Limite para rotas de autenticação (login/registro) — previne força bruta
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,                   // 20 tentativas por IP na janela
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

// Limite geral mais brando para a API (proteção básica contra abuso)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 120,            // 120 requisições por IP por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisições. Aguarde um instante.' },
});
