# Projeto Frontend React com SDK WebAuthn

Este projeto demonstra como implementar autenticação WebAuthn (biometria) em uma aplicação React moderna usando Vite e TypeScript.

A lógica é separada em:
-   Um **SDK** (`src/sdk/WebAuthnSDK.ts`) que encapsula toda a complexidade da API.
-   Um **Componente de Botão** (`src/components/WebAuthnButton.tsx`) reutilizável.
-   Uma **Aplicação de Exemplo** (`src/App.tsx`) que configura e usa o SDK e o componente.

## Como Executar

1.  **Instale as dependências**:
    ```bash
    npm install
    ```
2.  **Execute o servidor de desenvolvimento**:
    ```bash
    npm run dev
    ```
3.  Abra seu navegador em `http://localhost:5173`.
