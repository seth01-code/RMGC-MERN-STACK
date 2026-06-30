import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // ===== Existing Fields (unchanged) =====
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    isSeller: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },

    img: { type: String, default: "" },
    bio: { type: String, default: "" },
    country: { type: String, default: "" },
    phone: { type: String, default: "" },
    desc: { type: String, default: "" },

    // ── CHANGED: was [String], now a Mixed object storing AI-extracted portfolio
    // Structure:
    // {
    //   status: "pending" | "processing" | "completed" | "failed",
    //   headline: String,
    //   experience: Number,
    //   skills: [String],
    //   services: [String],
    //   industries: [String],
    //   certifications: [String],
    //   projects: [{
    //     name, description, technologies, outcomes,
    //     link: String,        // single project URL (GitHub repo, live demo, case study) — null if none found
    //     images: [String],   // Cloudinary URLs matched to this project specifically
    //   }],
    //   gallery: [String],    // extracted images that didn't map to one specific
    //                         // project (skills/tools graphics, cert badges, etc.)
    //   analyzedAt: Date,
    // }
    portfolio: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    languages: { type: [String], default: [] },

    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    fullName: { type: String },
    dob: { type: Date },
    address: { type: String, default: "" },
    yearsOfExperience: { type: String, default: "" },
    stateOfResidence: { type: String, default: "" },
    countryOfResidence: { type: String, default: "" },

    nextOfKin: {
      fullName: { type: String },
      dob: { type: Date },
      stateOfResidence: { type: String, default: "" },
      countryOfResidence: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      phone: { type: String, default: "" },
    },

    services: { type: [String], default: [] },
    // ─────────────────────────────────────────────────────────────
    // ADD THESE FIELDS to your existing UserSchema in models/User.js
    // Place them alongside the other top-level fields (e.g. after `services`)
    // ─────────────────────────────────────────────────────────────

    // Suspension
    suspended: { type: Boolean, default: false },
    suspendedAt: { type: Date, default: null },
    suspendReason: { type: String, default: null },

    role: {
      type: String,
      enum: ["organization", "remote_worker", null],
      default: null,
    },

    tier: {
      type: String,
      enum: ["free", "vip", null],
      default: null,
    },

    vipSubscription: {
      startDate: { type: Date },
      endDate: { type: Date },
      active: { type: Boolean, default: false },
      paymentReference: { type: String },
      transactionId: { type: String },
      gateway: {
        type: String,
        enum: ["paystack", "flutterwave", "stripe", null],
        default: null,
      },
      amount: { type: Number },
      currency: { type: String },
      cardToken: { type: String },
      invoices: [
        {
          invoiceId: { type: String },
          txRef: { type: String },
          amount: { type: Number },
          currency: { type: String },
          status: { type: String },
          chargedAt: { type: Date },
          processorResponse: { type: String },
          appFee: { type: Number },
          merchantFee: { type: Number },
        },
      ],
      lastCharge: {
        amount: { type: Number },
        currency: { type: String },
        status: { type: String },
        chargedAt: { type: Date },
        processorResponse: { type: String },
        appFee: { type: Number },
        merchantFee: { type: Number },
      },
    },

    organization: {
      name: { type: String },
      regNumber: { type: String },
      website: { type: String },
      description: { type: String },
      verified: { type: Boolean, default: false },
      contactEmail: { type: String },
      contactPhone: { type: String },
      logo: { type: String },
      address: { type: String },
      state: { type: String },
      country: { type: String },
      industry: { type: String },
      companySize: { type: String },
      socialLinks: {
        linkedin: { type: String, default: "" },
        twitter: { type: String, default: "" },
        facebook: { type: String, default: "" },
      },
    },

    postedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
