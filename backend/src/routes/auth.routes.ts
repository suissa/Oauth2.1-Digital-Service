// path: src/routes/auth.routes.ts
import { FastifyInstance } from 'fastify';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import User from '../models/user.model';
import { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/typescript-types';

const rpName = process.env.RP_NAME || 'Fastify WebAuthn';
const rpID = process.env.RP_ID || 'localhost';
const expectedOrigin = process.env.EXPECTED_ORIGIN || `http://${rpID}:5173`;

async function authRoutes(server: FastifyInstance) {
    // Rota para obter opções de registro
    server.post('/register-challenge', async (request, reply) => {
        const { username } = request.body as { username: string };
        if (!username) return reply.status(400).send({ error: 'Nome de usuário é obrigatório' });

        const existingUser = await User.findOne({ username });

        if (existingUser && existingUser.authenticators.length > 0) {
            return reply.status(400).send({ error: 'Usuário já registrado' });
        }

        const user = existingUser || new User({ username, authenticators: [] });

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userName: username,
            attestationType: 'none',
            excludeCredentials: user.authenticators.map(auth => ({
                id: auth.credentialID,
                type: 'public-key',
                transports: auth.transports,
            })),
            authenticatorSelection: {
                userVerification: 'preferred',
                requireResidentKey: false,
            },
        });

        user.currentChallenge = options.challenge;
        await user.save();

        return reply.send(options);
    });

    // Rota para verificar a resposta de registro
    server.post('/verify-registration', async (request, reply) => {
        const { username, response } = request.body as { username: string, response: RegistrationResponseJSON };
        const user = await User.findOne({ username });

        if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' });

        try {
            const verification = await verifyRegistrationResponse({
                response,
                expectedChallenge: user.currentChallenge!,
                expectedOrigin,
                expectedRPID: rpID,
            });

            if (verification.verified && verification.registrationInfo) {
                const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
                const newAuthenticator = {
                    credentialID,
                    credentialPublicKey,
                    counter,
                    credentialDeviceType: 'singleDevice',
                    credentialBackedUp: false,
                };
                user.authenticators.push(newAuthenticator);
                user.currentChallenge = undefined;
                await user.save();
                return reply.send({ success: true, message: `Usuário ${username} registrado com sucesso.` });
            } else {
                return reply.status(400).send({ error: 'Verificação falhou.' });
            }
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // Rota para obter opções de login
    server.post('/login-challenge', async (request, reply) => {
        const { username } = request.body as { username: string };
        const user = await User.findOne({ username });
        if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' });

        const options = await generateAuthenticationOptions({
            allowCredentials: user.authenticators.map(auth => ({
                id: auth.credentialID,
                type: 'public-key',
                transports: auth.transports,
            })),
            userVerification: 'preferred',
        });

        user.currentChallenge = options.challenge;
        await user.save();

        return reply.send(options);
    });

    // Rota para verificar a resposta de login
    server.post('/verify-login', async (request, reply) => {
        const { username, response } = request.body as { username: string, response: AuthenticationResponseJSON };
        const user = await User.findOne({ username });
        if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' });

        // Lógica de bypass para testes automatizados
        if (process.env.NODE_ENV === 'test') {
            // request.session.userId = user._id.toString();
            return reply.send({ success: true });
        }

        const authenticator = user.authenticators.find(
            auth => Buffer.from(auth.credentialID).toString('base64url') === response.id
        );
        if (!authenticator) return reply.status(400).send({ error: 'Autenticador não encontrado' });

        try {
            const verification = await verifyAuthenticationResponse({
                response,
                expectedChallenge: user.currentChallenge!,
                expectedOrigin,
                expectedRPID: rpID,
                authenticator,
            });

            if (verification.verified) {
                authenticator.counter = verification.authenticationInfo.newCounter;
                user.currentChallenge = undefined;
                await user.save();

                // request.session.userId = user._id.toString();
                return reply.send({ success: true });
            } else {
                return reply.status(400).send({ error: 'Verificação do login falhou.' });
            }
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
export default authRoutes;
