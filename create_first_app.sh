#!/bin/bash

# Este script insere ou atualiza o cliente OAuth inicial no MongoDB.

# --- Configuração ---
MONGO_HOST="localhost"
MONGO_PORT="27111"
DB_NAME="oauth-webauthn"
CLIENT_ID="minha-app-cliente-123"

CLIENT_DATA=$(cat <<EOF
{
  "name": "Minha Primeira Aplicação de Teste",
  "clientId": "${CLIENT_ID}",
  "clientSecret": "um_segredo_para_minha_app_cliente_456",
  "redirectUris": ["http://localhost:5173/callback", "https://oauth.pstmn.io/v1/callback"],
  "grants": ["authorization_code", "refresh_token"]
}
EOF
)

# Comando para inserir/atualizar o cliente
# Usamos replaceOne com upsert=true para que o script possa ser executado várias vezes sem erro.
echo "Verificando/Criando cliente OAuth no MongoDB..."
mongosh --host ${MONGO_HOST} --port ${MONGO_PORT} --eval "
  db.getSiblingDB('${DB_NAME}').clients.replaceOne(
    { clientId: '${CLIENT_ID}' },
    ${CLIENT_DATA},
    { upsert: true }
  );
"

# Verifica se o comando foi bem-sucedido
if [ $? -eq 0 ]; then
  echo "✅ Cliente OAuth '${CLIENT_ID}' configurado com sucesso."
else
  echo "❌ Erro ao configurar o cliente OAuth. Verifique se o MongoDB está rodando e acessível em ${MONGO_HOST}:${MONGO_PORT}."
  exit 1
fi

