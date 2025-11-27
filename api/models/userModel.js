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
    portfolioLink: { type: [String], default: [] },
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

    // ===== New RMGC Fields =====

    /**
     * ROLE:
     * - null → Freelancer (default, backward-compatible)
     * - "organization"
     * - "remote_worker"
     */
    role: {
      type: String,
      enum: ["organization", "remote_worker", null],
      default: null,
    },

    /**
     * TIER:
     * - null → Not a remote worker (freelancer or organization)
     * - "free" → Remote worker (free tier)
     * - "vip" → Remote worker (VIP tier, uses vipSubscription)
     */
    tier: {
      type: String,
      enum: ["free", "vip", null],
      default: null,
    },

    /**
     * VIP SUBSCRIPTION:
     * Used only when tier === "vip"
     */
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
      cardToken: { type: String }, // For auto-renewal
    },

    // ===== Organization Fields =====
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
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
