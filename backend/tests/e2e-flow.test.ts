import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { generatePKCE } from '../src/routes/oauth2.routes';
import Client from '../src/models/client.model';
import User from '../src/models/user.model';
import AuthCode from '../src/models/authCode.model';
import Token from '../src/models/token.model';
import { server } from '../src/server'; // Assuming server is exported from server.ts

const app = server;
const request = supertest(app.server);

const TEST_USER = { username: 'testuser' };
const FIRST_CLIENT = {
  name: 'Primeira App',
  clientId: 'client-1',
  clientSecret: 'secret-1',
  redirectUris: ['http://localhost:5173/callback'],
  grants: ['authorization_code', 'refresh_token'],
};

describe('Fluxo Completo de Autenticação OAuth 2.1 com WebAuthn', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await app.listen({ port: 0 });
  });

  afterAll(async () => {
    await app.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      Client.deleteMany({}),
      User.deleteMany({}),
      AuthCode.deleteMany({}),
      Token.deleteMany({}),
    ]);
  });

  it('deve registrar um usuário, criar um cliente, e completar o fluxo OAuth 2.1', async () => {
    await new Client(FIRST_CLIENT).save();

    const regChallengeRes = await request.post('/api/register-challenge').send(TEST_USER);
    expect(regChallengeRes.status).toBe(200);

    await request.post('/api/verify-registration').send({
      username: TEST_USER.username,
      response: { id: 'mockCredentialId', rawId: 'mockRawId' },
    });

    const pkce = generatePKCE();
    const user = await User.findOne({ username: TEST_USER.username });
    const authCode = new AuthCode({
      userId: user!._id,
      clientId: FIRST_CLIENT.clientId,
      code: 'test_auth_code',
      redirectUri: FIRST_CLIENT.redirectUris[0],
      codeChallenge: pkce.code_challenge,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await authCode.save();

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'test_auth_code',
      redirect_uri: FIRST_CLIENT.redirectUris[0],
      client_id: FIRST_CLIENT.clientId,
      code_verifier: pkce.code_verifier,
    });

    const tokenRes = await request.post('/oauth2/token').send(tokenParams.toString());

    expect(tokenRes.status).toBe(200);
    const accessToken = tokenRes.body.access_token;

    const profileRes = await request.get('/api/profile').set('Authorization', `Bearer ${accessToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.username).toBe(TEST_USER.username);
  });
});
