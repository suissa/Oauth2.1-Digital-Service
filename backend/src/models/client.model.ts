// path: src/models/client.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IClient extends Document {
    name: string;
    clientId: string;
    clientSecret: string;
    redirectUris: string[];
    grants: string[];
}

const ClientSchema = new Schema < IClient > ({
    name: { type: String, required: true },
    clientId: { type: String, required: true, unique: true },
    clientSecret: { type: String, required: true },
    redirectUris: [{ type: String, required: true }],
    grants: [{ type: String, required: true }],
}, { timestamps: true });

export default model < IClient > ('Client', ClientSchema);
