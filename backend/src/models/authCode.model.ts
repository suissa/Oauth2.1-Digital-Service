// path: src/models/authCode.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IAuthCode extends Document {
    userId: Schema.Types.ObjectId;
    clientId: string;
    code: string;
    redirectUri: string;
    codeChallenge: string;
    expiresAt: Date;
}

const AuthCodeSchema = new Schema < IAuthCode > ({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    redirectUri: { type: String, required: true },
    codeChallenge: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: '10m' }, // Expira em 10 minutos
}, { timestamps: true });

export default model < IAuthCode > ('AuthCode', AuthCodeSchema);
