// path: src/models/user.model.ts
import { Schema, model, Document } from 'mongoose';
import { AuthenticatorDevice } from '@simplewebauthn/typescript-types';

// Interface para o dispositivo autenticador, estendendo a do simplewebauthn
export interface IAuthenticator extends AuthenticatorDevice, Document {
    // Adicione campos personalizados se necessário
}

// Schema para o dispositivo autenticador
const AuthenticatorSchema = new Schema < IAuthenticator > ({
    credentialID: { type: Buffer, required: true, unique: true },
    credentialPublicKey: { type: Buffer, required: true },
    counter: { type: Number, required: true },
    credentialDeviceType: { type: String, required: true },
    credentialBackedUp: { type: Boolean, required: true },
    transports: [String],
});

// Interface para o documento do usuário
export interface IUser extends Document {
    username: string;
    currentChallenge ? : string;
    authenticators: IAuthenticator[];
}

// Schema para o usuário
const UserSchema = new Schema < IUser > ({
    username: { type: String, required: true, unique: true, lowercase: true },
    currentChallenge: { type: String },
    authenticators: [AuthenticatorSchema],
}, { timestamps: true });

export default model < IUser > ('User', UserSchema);
