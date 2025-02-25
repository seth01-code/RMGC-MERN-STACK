import React, { useState } from "react";
import upload from "../../utils/upload"; // Assuming this function uploads the image
import newRequest from "../../utils/newRequest";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify"; // Importing toast for notifications
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

function RegisterClient() {
  const [file, setFile] = useState(null);
  const [user, setUser] = useState({
    username: "",
    fullName: "", // ✅ Added Full Name
    email: "",
    password: "",
    img: "", // This will hold the Cloudinary image URL
    dob: "", // ✅ Added Date of Birth
    country: "",
    stateOfResidence: "", // ✅ Added State of Residence
    countryOfResidence: "", // ✅ Added Country of Residence
    address: "", // ✅ Added Address
    isSeller: false, // Always false for clients
  });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Always update the state
    setUser((prev) => ({ ...prev, [name]: value }));

    // If the input field is DOB, validate age
    if (name === "dob") {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      

      if (age < 18) {
        toast.error("You must be at least 18 years old to register.");
      }
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = user.profilePicture || user.img; // Use existing image if available

    // ✅ Upload image if a new file is selected

    if (file) {
      try {
        const uploadedImage = await upload(file);
        imageUrl = uploadedImage?.url || ""; // Ensure only the URL is stored
      } catch (err) {
        toast.error(t("errorUploadingImage"));
        return;
      }
    }

    // ✅ Prepare user data with image
    const userData = {
      ...user,
      img: imageUrl || "",
    };

    try {
      // ✅ Send registration request
      const res = await newRequest.post("/auth/register", userData);

      // ✅ Show success message
      toast.success(t("otpSentToEmail"));

      // ✅ Redirect user to OTP verification page
      navigate(`/verify-otp?email=${user.email}`);
    } catch (err) {
      toast.error(err.response?.data.message || "Registration failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="w-[600px] bg-white rounded-lg p-10 flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-gray-700">
          {t("registerAsClient")}
        </h1>

        <label className="text-gray-600">{t("fullName")}</label>
        <input
          name="fullName"
          type="text"
          placeholder={t("fullNamePlaceholder")}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <label className="text-gray-600">{t("username")}</label>
        <input
          name="username"
          type="text"
          placeholder={t("usernamePlaceholder")}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <label className="text-gray-600">{t("email")}</label>
        <input
          name="email"
          type="email"
          placeholder={t("emailPlaceholder")}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <label className="text-gray-600">{t("password")}</label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            onChange={handleChange}
            className="p-3 border rounded-md w-full pr-10"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5 text-gray-500" />
            ) : (
              <Eye className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        <label className="text-gray-600">{t("dob")}</label>
        <input
          name="dob"
          type="date"
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <label className="text-gray-600">{t("profilePicture")}</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="p-2 border rounded-md"
        />

        <label className="text-gray-600">{t("countryOfResidence")}</label>
        <input
          name="country"
          type="text"
          placeholder={t("countryOfResidence")}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <label className="text-gray-600">{t("stateOfResidence")}</label>
        <input
          name="stateOfResidence"
          type="text"
          placeholder={t("stateOfResidencePlaceholder")}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <label className="text-gray-600">{t("address")}</label>
        <input
          name="address"
          type="text"
          placeholder={t("addressPlaceholder")}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <button
          type="submit"
          className="bg-gradient-to-tr from bg-gradientStart to bg-gradientEnd text-white py-3 rounded-md font-semibold"
          disabled={loading}
        >
          {loading ? t("registering") : t("registerAndLogin")}
        </button>
      </form>
    </div>
  );
}

export default RegisterClient;
