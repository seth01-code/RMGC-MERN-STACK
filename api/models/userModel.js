import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isSeller: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    img: { type: String, default: "" }, // Profile picture
    bio: { type: String, default: "" },
    country: { type: String, default: "" },
    phone: { type: String, default: "" }, // Added phone field
    desc: { type: String, default: "" }, // Added description field
    portfolioLink: { type: [String], default: [] }, // Default should be an array
    languages: { type: [String], default: [] }, // Default should be an array
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    // New fields added from your list
    fullName: { type: String },
    dob: { type: Date },
    address: { type: String, default: "" },
    yearsOfExperience: { type: String, default: "" },
    stateOfResidence: { type: String, default: "" },
    countryOfResidence: { type: String, default: "" },

    // Next of Kin details
    nextOfKin: {
      fullName: { type: String },
      dob: { type: Date },
      stateOfResidence: { type: String, default: "" },
      countryOfResidence: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      phone: { type: String, default: "" },
    },

    // List of services provided by the user
    services: { type: [String], default: [] },
  },
  { timestamps: true } // ✅ This automatically adds createdAt & updatedAt
);

// Check if the model is already defined (prevents overwriting)
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
