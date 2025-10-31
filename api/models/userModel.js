import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // ===== Existing Fields (unchanged) =====
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isSeller: { type: Boolean, default: false }, // ⚠️ Leave untouched for freelancer logic
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

    // ===== New Additions for RMGC Expansion =====

    // (1) Role definition for new types
    role: {
      type: String,
      enum: ["organization", "remote_worker"],
      default: null, // ⚠️ null ensures freelancers remain unaffected
    },

    // (2) For remote workers — Free or VIP tier
    tier: {
      type: String,
      enum: ["free", "vip", null],
      default: null,
    },

    // (3) VIP subscription tracking (applies only if tier === 'vip')
    vipSubscription: {
      startDate: { type: Date },
      endDate: { type: Date },
      active: { type: Boolean, default: false },
      paymentReference: { type: String },
      gateway: {
        type: String,
        enum: ["paystack", "flutterwave", "stripe", null],
        default: null,
      },
    },

    // (4) Organization-specific fields (for role === 'organization')
    organization: {
      name: { type: String },
      regNumber: { type: String },
      website: { type: String },
      description: { type: String },
      verified: { type: Boolean, default: false },
      contactEmail: { type: String },
      contactPhone: { type: String },
      logo: { type: String },

      // ===== New fields to match frontend form =====
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

    // (5) List of jobs posted by this organization
    postedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
