import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Nao autorizado',
    });
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', req.user.id)
    .single();

  if (error || profile?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado',
    });
  }

  // Apenas administradores passam daqui para frente.
  next();
}
