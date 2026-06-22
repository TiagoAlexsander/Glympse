import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// Middleware genérico de validação do corpo da requisição com zod.
// Em caso de erro, retorna 400 com a primeira mensagem; senão substitui req.body pelo dado validado.
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Dados inválidos.';
      return res.status(400).json({ success: false, error: msg });
    }
    req.body = result.data;
    next();
  };
}
