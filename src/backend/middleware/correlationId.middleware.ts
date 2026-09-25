import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { contextStorage } from '../lib/logger';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const cid = (req.header('x-correlation-id') || nanoid()) as string;
  (req as unknown as { cid?: string }).cid = cid;
  
  const store = new Map<string, string>();
  store.set('correlationId', cid);
  
  contextStorage.run(store, () => {
    next();
  });
}
