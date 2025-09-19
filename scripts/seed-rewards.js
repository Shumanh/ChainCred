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

const RewardSchema = new mongoose.Schema({
  bizId: String,
  id: String,
  name: String,
  cost: Number,
}, { timestamps: true });

const Reward = mongoose.models.Reward || mongoose.model('Reward', RewardSchema);

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: 'loyalty' });
  const configPath = path.join(process.cwd(), 'src', 'lib', 'rewards.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const items = JSON.parse(raw);
  for (const entry of items) {
    const { bizId, rewards } = entry;
    for (const r of rewards) {
      await Reward.findOneAndUpdate(
        { bizId, id: r.id },
        { bizId, id: r.id, name: r.name, cost: r.cost },
        { new: true, upsert: true }
      );
    }
  }
  console.log('Seeded rewards');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


