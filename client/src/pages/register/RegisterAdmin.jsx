import React, { useState } from "react";
import upload from "../../utils/upload"; // Assuming this function uploads the image
import newRequest from "../../utils/newRequest"; // Ensure this utility exists
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify"; // Import toastify
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

const RegisterAdmin = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    country: "",
    phone: "",
    img: "", // Store the image URL
  });
  const [file, setFile] = useState(null); // For the file upload
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const { t } = useTranslation();

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // ✅ Ensure email ends with "@renewedmindsglobalconsult.com"
    if (!formData.email.endsWith("@renewedmindsglobalconsult.com")) {
      toast.error("You are not able to register as an admin");
      setLoading(false);
      return;
    }

    let imageUrl = formData.img;

    // ✅ If a file is selected, upload the file and get the URL

    if (file) {
      try {
        const uploadedImage = await upload(file);
        imageUrl = uploadedImage?.url || ""; // Ensure only the URL is stored
      } catch (err) {
        toast.error(t("errorUploadingImage"));
        return;
      }
    }

    // ✅ Ensure the image URL is set before submitting the form data
    const userData = {
      ...formData,
      img: imageUrl || "", // Include the image URL or empty string if upload failed
      isAdmin: true, // Admin only if email matches domain
    };

    try {
      // ✅ Send the registration request
      await newRequest.post("/auth/register", userData);

      // ✅ Redirect to OTP verification with email
      navigate(`/verify-otp?email=${formData.email}`);
      toast.success(t("otpSentCheckEmail")); // Show success message
    } catch (err) {
      toast.error(err.response?.data || t("registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="w-[600px] bg-white rounded-lg p-10 flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-gray-700">
          {t("registerAsAdmin")}
        </h1>

        <label className="text-gray-600">{t("username")}</label>
        <input
          name="username"
          type="text"
          placeholder={t("usernamePlaceholder")}
          value={formData.username}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <label className="text-gray-600">{t("adminEmail")}</label>
        <input
          name="email"
          type="email"
          placeholder={t("emailPlaceholder")}
          value={formData.email}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />
        <label className="text-gray-600">{t("password")}</label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
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
        <label className="text-gray-600">{t("profilePicture")}</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="p-2 border rounded-md"
        />

        <label className="text-gray-600">{t("country")}</label>
        <input
          name="country"
          type="text"
          placeholder={t("countryPlaceholder")}
          value={formData.country}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <label className="text-gray-600">{t("phone")}</label>
        <input
          name="phone"
          type="text"
          placeholder={t("phonePlaceholder")}
          value={formData.phone}
          onChange={handleChange}
          className="p-3 border rounded-md"
        />

        <button
          type="submit"
          className="bg-gradient-to-tr from bg-gradientStart to bg-gradientEnd text-white py-3 rounded-md font-semibold"
          disabled={loading}
        >
          {loading ? t("registering") : t("registerAsAdmin")}
        </button>
      </form>
    </div>
  );
};

export default RegisterAdmin;
