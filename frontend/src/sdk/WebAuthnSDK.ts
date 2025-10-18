// --- Funções Auxiliares ---
const base64UrlToArrayBuffer = (base64Url: string): ArrayBuffer => {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const arrayBufferToBase64Url = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

// --- Tipos e Interfaces do SDK ---
export interface SDKConfig {
  rp: { id: string; name: string; };
  getRegistrationChallenge: (username: string) => Promise<any>;
  verifyRegistration: (username: string, response: any) => Promise<any>;
  getLoginChallenge: (username: string) => Promise<any>;
  verifyLogin: (username: string, response: any) => Promise<any>;
}

export class WebAuthnSDK {
  private config: SDKConfig;

  constructor(config: SDKConfig) {
    if (!config?.rp?.id || !config.rp.name) {
      throw new Error("A configuração do Relying Party (rp.id, rp.name) é obrigatória.");
    }
    this.config = config;
  }

  public isSupported(): boolean {
    return typeof window.PublicKeyCredential !== 'undefined';
  }

  public async register(username: string): Promise<any> {
    if (!this.isSupported()) throw new Error("WebAuthn não é suportado neste navegador.");
    const creationOptions = await this.config.getRegistrationChallenge(username);
    creationOptions.challenge = base64UrlToArrayBuffer(creationOptions.challenge);
    creationOptions.user.id = base64UrlToArrayBuffer(creationOptions.user.id);
    creationOptions.rp = this.config.rp;
    const credential = (await navigator.credentials.create({ publicKey: creationOptions })) as PublicKeyCredential;
    const attestationResponse = {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      response: {
        clientDataJSON: arrayBufferToBase64Url((credential.response as AuthenticatorAttestationResponse).clientDataJSON),
        attestationObject: arrayBufferToBase64Url((credential.response as AuthenticatorAttestationResponse).attestationObject),
      },
      type: credential.type,
    };
    return this.config.verifyRegistration(username, attestationResponse);
  }

  public async login(username: string): Promise<any> {
    if (!this.isSupported()) throw new Error("WebAuthn não é suportado neste navegador.");
    const requestOptions = await this.config.getLoginChallenge(username);
    requestOptions.challenge = base64UrlToArrayBuffer(requestOptions.challenge);
    if (requestOptions.allowCredentials) {
        requestOptions.allowCredentials.forEach((cred: any) => {
            cred.id = base64UrlToArrayBuffer(cred.id);
        });
    }
    requestOptions.rpId = this.config.rp.id;
    const assertion = (await navigator.credentials.get({ publicKey: requestOptions })) as PublicKeyCredential;
    const response = assertion.response as AuthenticatorAssertionResponse;
    const assertionResponse = {
      id: assertion.id,
      rawId: arrayBufferToBase64Url(assertion.rawId),
      response: {
        authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
        clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
        signature: arrayBufferToBase64Url(response.signature),
        userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : null,
      },
      type: assertion.type,
    };
    return this.config.verifyLogin(username, assertionResponse);
  }
}
