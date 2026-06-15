// src/middlewares/asyncHandler.ts
import { Response, NextFunction, RequestHandler } from 'express';

type AsyncFn = (req: any, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncFn): RequestHandler =>
  (req, res, next) => fn(req, res, next).catch(next);