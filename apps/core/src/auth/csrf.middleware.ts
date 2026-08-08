import type { NextFunction, Request, Response } from 'express';

import type { CoreConfig } from '../config';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF por validación de Origin: como la auth va en cookie, todo método
 * mutante de /api debe traer un Origin de nuestras propias superficies.
 * (Los navegadores siempre lo envían en peticiones cross-site y same-site
 * mutantes; un <form> de un tercero llega con el Origin del atacante.)
 */
export function csrfOriginCheck(config: CoreConfig) {
  const allowed = new Set(
    [config.publicBaseUrl, config.adminBaseUrl].map((url) => new URL(url).origin),
  );
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATING.has(req.method) || !req.path.startsWith('/api/')) {
      next();
      return;
    }
    const origin = req.headers.origin;
    if (typeof origin !== 'string' || !allowed.has(origin)) {
      res.status(403).json({ message: 'origen no permitido' });
      return;
    }
    next();
  };
}
