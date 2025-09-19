import mongoose, { Schema } from "mongoose";

const BusinessSchema = new Schema(
  {
    bizId: String, // stable external id
    name: String,
    mintAddress: String,
    merchantRedemption: String,
    tokenProgram: { type: String, enum: ["spl", "token2022"] },
  },
  { timestamps: true }
);

const ApiKeySchema = new Schema(
  {
    businessId: Schema.Types.ObjectId,
    keyHash: String, // sha256 of API key
    scopes: [String],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const IssuanceSchema = new Schema(
  {
    businessId: Schema.Types.ObjectId,
    customer: String, // pubkey
    amount: Number, // UI amount
    signature: String,
  },
  { timestamps: true }
);

const RedemptionSchema = new Schema(
  {
    businessId: Schema.Types.ObjectId,
    customer: String,
    rewardId: String,
    rewardName: String,
    cost: Number, // UI amount
    signature: String,
  },
  { timestamps: true }
);

export const Business = mongoose.models.Business || mongoose.model("Business", BusinessSchema);
export const ApiKey = mongoose.models.ApiKey || mongoose.model("ApiKey", ApiKeySchema);
export const Issuance = mongoose.models.Issuance || mongoose.model("Issuance", IssuanceSchema);
export const Redemption = mongoose.models.Redemption || mongoose.model("Redemption", RedemptionSchema);

const RateLimitSchema = new Schema(
  {
    subject: String, // businessId or apiKeyId
    window: String,  // e.g., "1m" or "1d"
    count: { type: Number, default: 0 },
    resetAt: Date,
  },
  { timestamps: true }
);

const IdempotencySchema = new Schema(
  {
    businessId: Schema.Types.ObjectId,
    key: String,
    signature: String,
  },
  { timestamps: true, index: { unique: true } }
);

RateLimitSchema.index({ subject: 1, window: 1 });
IdempotencySchema.index({ businessId: 1, key: 1 }, { unique: true });

export const RateLimit = mongoose.models.RateLimit || mongoose.model("RateLimit", RateLimitSchema);
export const Idempotency = mongoose.models.Idempotency || mongoose.model("Idempotency", IdempotencySchema);

const RewardSchema = new Schema(
  {
    bizId: String,
    id: String, // reward id
    name: String,
    cost: Number,
  },
  { timestamps: true }
);

RewardSchema.index({ bizId: 1, id: 1 }, { unique: true });

export const Reward = mongoose.models.Reward || mongoose.model("Reward", RewardSchema);


