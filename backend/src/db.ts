// path: src/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;
        if (!mongoURI) {
            console.error("MONGO_URI não definida no arquivo .env");
            process.exit(1);
        }
        await mongoose.connect(mongoURI);
        console.log("MongoDB Conectado...");
    } catch (err: any) {
        console.error(err.message);
        process.exit(1);
    }
};

export default connectDB;
