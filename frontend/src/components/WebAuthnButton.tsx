import React, { useState, useEffect, useCallback } from 'react';
import { WebAuthnSDK } from '../sdk/WebAuthnSDK';

interface WebAuthnButtonProps {
  sdk: WebAuthnSDK;
  mode: 'register' | 'login';
  username: string;
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const WebAuthnButton: React.FC<WebAuthnButtonProps> = ({
  sdk, mode, username, onSuccess, onError, children, className, disabled: parentDisabled = false,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUnsupported, setIsUnsupported] = useState<boolean>(false);

  useEffect(() => {
    if (!sdk.isSupported()) {
      setIsUnsupported(true);
      onError(new Error("WebAuthn não é suportado."));
    }
  }, [sdk, onError]);

  const handleClick = useCallback(async () => {
    if (!username) {
      onError(new Error("O nome de utilizador é obrigatório."));
      return;
    }
    setIsLoading(true);
    try {
      const result = await (mode === 'register' ? sdk.register(username) : sdk.login(username));
      onSuccess(result);
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [sdk, mode, username, onSuccess, onError]);

  if (isUnsupported) {
    return <button className={className} disabled>WebAuthn não suportado</button>;
  }

  return (
    <button onClick={handleClick} disabled={isLoading || parentDisabled} className={className}>
      {isLoading ? 'Aguardando...' : children}
    </button>
  );
};

export default WebAuthnButton;
