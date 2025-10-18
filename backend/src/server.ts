import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import connectDB from './db';
import authRoutes from './routes/auth.routes';
import oauth2Routes from './routes/oauth2.routes';
import apiRoutes from './routes/api.routes';

dotenv.config();

export const server = Fastify({ logger: true });

// Middlewares
server.register(cors, {
  origin: process.env.EXPECTED_ORIGIN,
  credentials: true,
});
server.register(formbody);
server.register(cookie);
server.register(session, {
  secret: process.env.SESSION_SECRET as string,
  cookie: { secure: process.env.NODE_ENV === 'production' },
  saveUninitialized: false,
});

// Rotas
server.register(authRoutes, { prefix: '/api' });
server.register(oauth2Routes, { prefix: '/oauth2' });
server.register(apiRoutes, { prefix: '/api' });

// Rota de health check
server.get('/', async (request, reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await connectDB();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await server.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}
