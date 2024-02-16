import { AddressInfo } from 'ws';
import type { Request, Response, NextFunction } from 'express';
import type { ExotErrorHandlerOptions, ExotMiddlewareOptions, ExotWebSocketServerOptions } from '../lib/types.js';
export declare function errorHandler(options: ExotErrorHandlerOptions): (err: any, req: Request, res: Response, next: NextFunction) => void;
export declare function middleware(options: ExotMiddlewareOptions): (req: Request, res: Response, next: NextFunction) => void;
export declare function websocketServer(options: ExotWebSocketServerOptions): Promise<string | AddressInfo>;
