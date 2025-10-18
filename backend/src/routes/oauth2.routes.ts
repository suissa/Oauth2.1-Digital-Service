// path: src/routes/oauth2.routes.ts
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Client from '../models/client.model';
import User from '../models/user.model';
import AuthCode from '../models/authCode.model';
import Token from '../models/token.model';

// Função para gerar PKCE
export const generatePKCE = () => {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { code_verifier: verifier, code_challenge: challenge };
};

async function oauth2Routes(server: FastifyInstance) {
    // Rota de autorização
    server.get('/authorize', async (request, reply) => {
        const { client_id, redirect_uri, code_challenge, state } = request.query as any;

        const client = await Client.findOne({ clientId: client_id });
        if (!client || !client.redirectUris.includes(redirect_uri)) {
            return reply.status(400).send({ error: 'Cliente ou redirect_uri inválido' });
        }

        if (!request.session.userId) {
            // Se não estiver logado, redireciona para a página de login do frontend,
            // que por sua vez iniciará o fluxo de autenticação WebAuthn.
            const loginRedirectUrl = `${process.env.EXPECTED_ORIGIN}/login?${new URLSearchParams(request.query as any).toString()}`;
            return reply.redirect(loginRedirectUrl);
        }

        // Simula a tela de consentimento e gera o código de autorização
        const authCode = new AuthCode({
            userId: request.session.userId,
            clientId: client_id,
            code: crypto.randomBytes(16).toString('hex'),
            redirectUri: redirect_uri,
            codeChallenge: code_challenge,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
        });
        await authCode.save();

        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set('code', authCode.code);
        if (state) {
            redirectUrl.searchParams.set('state', state);
        }
        return reply.redirect(redirectUrl.toString());
    });

    // Rota para obter o token
    server.post('/token', async (request, reply) => {
        const { grant_type, code, redirect_uri, client_id, code_verifier, refresh_token } = request.body as any;

        const client = await Client.findOne({ clientId: client_id });
        if (!client) return reply.status(401).send({ error: 'Cliente inválido' });

        if (grant_type === 'authorization_code') {
            const authCode = await AuthCode.findOne({ code });
            if (!authCode || authCode.redirectUri !== redirect_uri || authCode.clientId !== client_id) {
                return reply.status(400).send({ error: 'Código de autorização inválido' });
            }

            const challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');
            if (challenge !== authCode.codeChallenge) {
                return reply.status(400).send({ error: 'code_verifier inválido' });
            }

            await AuthCode.deleteOne({ _id: authCode._id });

            const user = await User.findById(authCode.userId);
            if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' });

            const accessToken = jwt.sign({ sub: user._id, username: user.username },
                process.env.JWT_SECRET!, { expiresIn: '1h' }
            );

            const newRefreshToken = new Token({
                userId: user._id,
                clientId: client_id,
                refreshToken: crypto.randomBytes(32).toString('hex'),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
            });
            await newRefreshToken.save();

            return reply.send({
                access_token: accessToken,
                refresh_token: newRefreshToken.refreshToken,
                token_type: 'Bearer',
                expires_in: 3600,
            });

        } else if (grant_type === 'refresh_token') {
            const tokenDoc = await Token.findOne({ refreshToken: refresh_token, clientId: client_id });
            if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
                return reply.status(401).send({ error: 'Refresh token inválido ou expirado.' });
            }

            const user = await User.findById(tokenDoc.userId);
            if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' });

            const accessToken = jwt.sign({ sub: user._id, username: user.username },
                process.env.JWT_SECRET!, { expiresIn: '1h' }
            );

            return reply.send({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: 3600,
            });

        } else {
            return reply.status(400).send({ error: 'grant_type inválido' });
        }
    });
}
export default oauth2Routes;
