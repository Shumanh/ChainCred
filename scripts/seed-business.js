import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const BusinessSchema = new mongoose.Schema({
  bizId: String,
  name: String,
  mintAddress: String,
  merchantRedemption: String,
  tokenProgram: String,
}, { timestamps: true });
const ApiKeySchema = new mongoose.Schema({
  businessId: mongoose.Schema.Types.ObjectId,
  keyHash: String,
  scopes: [String],
  active: { type: Boolean, default: true },
}, { timestamps: true });

const Business = mongoose.models.Business || mongoose.model('Business', BusinessSchema);
const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema);

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: 'loyalty' });
  const configPath = path.join(process.cwd(), 'src', 'lib', 'businesses.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No businesses found in src/lib/businesses.json');
  }
  // seed or upsert all businesses from file
  const results = [];
  for (const b of items) {
    const tokenProgram = b.token2022 ? 'token2022' : 'spl';
    const doc = await Business.findOneAndUpdate(
      { bizId: b.id },
      { bizId: b.id, name: b.name, mintAddress: b.mintAddress, merchantRedemption: b.merchantRedemption, tokenProgram },
      { new: true, upsert: true }
    );
    results.push(doc);
  }
  console.log('Seeded businesses:', results.map((d) => d._id.toString()).join(', '));

  // link first API key to first business if not set
  const firstBiz = results[0];
  const firstKey = await ApiKey.findOne({});
  if (firstKey && !firstKey.businessId) {
    firstKey.businessId = firstBiz._id;
    await firstKey.save();
    console.log('Linked API key', firstKey._id.toString(), 'to business', firstBiz._id.toString());
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


