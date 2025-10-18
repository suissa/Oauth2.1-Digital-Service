import React, { useState, useMemo } from 'react';
import { WebAuthnSDK, SDKConfig } from './sdk/WebAuthnSDK';
import WebAuthnButton from './components/WebAuthnButton';

type StatusType = 'info' | 'success' | 'error';

export default function App() {
  const [username, setUsername] = useState<string>('');
  const [status, setStatus] = useState<{ message: string; type: StatusType }>({ message: 'Pronto.', type: 'info' });
  const [mcpToken, setMcpToken] = useState<string | null>(null);

  const webAuthnSdk = useMemo(() => {
    const API_URL = 'http://localhost:3000/api';

    const sdkConfig: SDKConfig = {
      rp: { id: 'localhost', name: 'React SDK Demo' },
      getRegistrationChallenge: async (username) => {
        const response = await fetch(`${API_URL}/register-challenge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Falha ao obter desafio de registro.');
        }
        return response.json();
      },
      verifyRegistration: async (username, attestationResponse) => {
        const response = await fetch(`${API_URL}/verify-registration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, response: attestationResponse }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Falha ao verificar registro.');
        }
        return response.json();
      },
      getLoginChallenge: async (username) => {
        const response = await fetch(`${API_URL}/login-challenge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Falha ao obter desafio de login.');
        }
        return response.json();
      },
      verifyLogin: async (username, assertionResponse) => {
        const response = await fetch(`${API_URL}/verify-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, response: assertionResponse }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Falha ao verificar login.');
        }
        return response.json();
      }
    };
    return new WebAuthnSDK(sdkConfig);
  }, []);

  const handleSuccess = (result: any) => {
    setStatus({ message: result.message || 'Operação concluída com sucesso!', type: 'success' });
    if (result.token) {
      setMcpToken(result.token);
    }
  };

  const handleError = (error: Error) => {
    setStatus({ message: `Erro: ${error.message}`, type: 'error' });
  };

  const statusColor = status.type === 'error' ? 'text-red-500' : (status.type === 'success' ? 'text-green-500' : 'text-gray-600');

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Cliente WebAuthn</h1>
          <p className="text-gray-500 mt-2">React + Vite + TS</p>
        </div>
        <div>
          <label htmlFor="username" className="text-sm font-semibold text-gray-600 block mb-2">Nome de Utilizador</label>
          <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Digite para habilitar" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <WebAuthnButton sdk={webAuthnSdk} mode="register" username={username} onSuccess={handleSuccess} onError={handleError} disabled={!username} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            Registar com Digital
          </WebAuthnButton>
          <WebAuthnButton sdk={webAuthnSdk} mode="login" username={username} onSuccess={handleSuccess} onError={handleError} disabled={!username} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            Entrar com Digital
          </WebAuthnButton>
        </div>
        <div className="text-center text-sm pt-4 border-t border-gray-200">
           <p className={statusColor}>{status.message}</p>
        </div>
        {mcpToken && (
          <div className="pt-6 border-t border-gray-200 space-y-4">
            <h2 className="text-lg font-semibold text-center text-gray-700">Autenticado!</h2>
            <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded break-all">
              <strong>Token de Acesso:</strong> {mcpToken}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
