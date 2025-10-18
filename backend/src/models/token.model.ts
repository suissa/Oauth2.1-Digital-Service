// path: src/models/token.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IToken extends Document {
    userId: Schema.Types.ObjectId;
    clientId: string;
    refreshToken: string;
    expiresAt: Date;
}

const TokenSchema = new Schema < IToken > ({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: String, required: true },
    refreshToken: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

export default model < IToken > ('Token', TokenSchema);
