import mongoose, { Schema, Document } from "mongoose";

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

export interface IUrl extends Document {
  id: number;
  url: string;
  createdAt: Date;
}

const urlSchema = new Schema<IUrl>({
  id: { type: Number, unique: true, index: true },
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

urlSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        "url_id",
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.id = counter.seq;
      next();
    } catch (err) {
      next(err as Error);
    }
  } else {
    next();
  }
});

const Url = mongoose.model<IUrl>("Url", urlSchema);

export async function findByShortId(id: number): Promise<IUrl | null> {
  return Url.findOne({ id });
}

export async function createShortUrl(url: string): Promise<IUrl> {
  const record = new Url({ url });
  return record.save();
}

export default Url;
