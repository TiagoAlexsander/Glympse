import { NextFunction, Request, Response } from 'express';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Nao autorizado',
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({
      success: false,
      error: 'Nao autorizado',
    });
  }

  // Guardamos o usuario autenticado para os proximos middlewares e controllers.
  req.user = data.user;
  next();
}

// Versão opcional — não bloqueia se não tiver token, apenas anexa req.user se houver
// Usado nas rotas de carrinho que funcionam para guest e logado
export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const { data } = await supabase.auth.getUser(token);
    if (data.user) req.user = data.user;
  }

  next();
}
