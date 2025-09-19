import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import crypto from 'crypto';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const RAW_KEY = process.env.NEXT_PUBLIC_MERCHANT_API_KEY;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}
if (!RAW_KEY) {
  console.error('NEXT_PUBLIC_MERCHANT_API_KEY not set');
  process.exit(1);
}

const keyHash = crypto.createHash('sha256').update(RAW_KEY).digest('hex');

const ApiKeySchema = new mongoose.Schema(
  {
    businessId: mongoose.Schema.Types.ObjectId,
    keyHash: String,
    scopes: [String],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema);

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: 'loyalty' });
  const existing = await ApiKey.findOne({ keyHash });
  if (existing) {
    console.log('API key already exists, id:', existing._id.toString());
  } else {
    const doc = await ApiKey.create({ keyHash, scopes: ['mint', 'redeem'], active: true });
    console.log('Created API key record:', doc._id.toString());
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


