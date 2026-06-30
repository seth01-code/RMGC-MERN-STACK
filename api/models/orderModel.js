import mongoose from "mongoose";
const { Schema } = mongoose;

const OrderSchema = new Schema(
  {
    gigId: {
      type: String,
      // Required unless this order came from a job booking instead of a gig.
      required: function () {
        return !this.workId;
      },
    },
    workId: {
      type: String,
      // Required unless this order came from a gig purchase instead of a job.
      required: function () {
        return !this.gigId;
      },
    },
    img: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    sellerId: {
      type: String,
      required: true,
    },
    buyerId: {
      type: String,
      required: true,
    },
    isCompleted: {
      type: Boolean,
      required: false,
    },
    payment_intent: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Order", OrderSchema);