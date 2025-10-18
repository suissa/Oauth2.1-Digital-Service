// path: src/routes/api.routes.ts
import { FastifyInstance } from 'fastify';
import { requireAuth } from '../hooks/requireAuth';

async function apiRoutes(server: FastifyInstance) {
    // Exemplo de uma rota protegida que retorna informações do usuário
    server.get('/profile', { preHandler: [requireAuth] }, async (request, reply) => {
        // A identidade do usuário (payload do JWT) é adicionada ao request pelo hook requireAuth
        const userData = (request as any).user;
        // Retorna os dados do perfil do usuário contidos no token
        return reply.send({
            id: userData.sub,
            username: userData.username,
            message: 'Este é um recurso protegido!',
        });
    });
}
export default apiRoutes;
