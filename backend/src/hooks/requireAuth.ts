// path: src/hooks/requireAuth.ts
import { FastifyRequest, FastifyReply, DoneFuncWithErrOrRes } from 'fastify';
import jwt from 'jsonwebtoken';

export const requireAuth = (request: FastifyRequest, reply: FastifyReply, done: DoneFuncWithErrOrRes) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Token de autenticação não fornecido.' });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        // Adiciona o payload decodificado ao request para uso posterior, se necessário
        (request as any).user = decoded;
        done();
    } catch (error) {
        return reply.status(401).send({ error: 'Token inválido ou expirado.' });
    }
};
