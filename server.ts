import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import compression from 'compression';

// Import environment config to fail fast if missing required envs
 

// Import backend routes
import znsRoutes from './src/backend/routes/zns.routes';
import cronRoutes from './src/backend/routes/cron.routes';
import workflowRoutes from './src/backend/routes/workflow.routes';
import exportRoutes from './src/backend/routes/export.routes';
import analyticsRoutes from './src/backend/routes/analytics.routes';
import { metricsRoutes } from './src/backend/routes/metrics.routes';
import { migrationRoutes } from './src/backend/routes/migration.routes';
import znsTemplateRoutes from './src/backend/routes/zns-template.routes';
import telegramRoutes from './src/backend/routes/telegram.routes';
import { searchRoutes } from './src/backend/routes/search.routes';
import customerRoutes from './src/backend/routes/customer.routes';
import reportsRoutes from './src/backend/routes/reports.routes';
import quotationRoutes from './src/backend/routes/quotation.routes';
import { correlationIdMiddleware } from './src/backend/middleware/correlationId.middleware';
import { bootstrapMachines } from './src/backend/workflow/machines';

async function startServer() {
  // Bootstrap all workflow state machines
  bootstrapMachines();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(compression());
  app.use(cors({
    origin: process.env.APP_URL ? [process.env.APP_URL] : true,
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(correlationIdMiddleware);

  // Handle JSON parsing errors so it doesn't leak into Vite HTML error
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {  
    if (err instanceof SyntaxError && 'body' in err) {
      console.error('JSON parse error on payload:', err.message);
      return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
    }
    next(err);
  });

  // Health check routes
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/zns', znsRoutes);
  app.use('/api/cron', cronRoutes);
  app.use('/api/workflow', workflowRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/migration', migrationRoutes);
  app.use('/api/zns-templates', znsTemplateRoutes);
  app.use('/api/telegram', telegramRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/quotations', quotationRoutes);

  // Permanent caching for local /fonts folder (Vietnamese local network optimization)
  const fontsPath = path.join(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/fonts' : 'public/fonts');
  app.use('/fonts', express.static(fontsPath, {
    maxAge: 31536000000, // 1 year in ms
    immutable: true,
    fallthrough: true
  }));

  // Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: 25000 + Math.floor(Math.random() * 40000) }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const buildPath = path.join(process.cwd(), 'dist');
    app.use(express.static(buildPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(buildPath, 'index.html'));
      }
      next();
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {  
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please terminate the conflicting process or assign another PORT.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
