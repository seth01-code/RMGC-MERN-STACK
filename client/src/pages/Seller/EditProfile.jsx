import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import upload from "../../utils/upload"; // Assuming upload function exists
import newRequest from "../../utils/newRequest";
import { toast } from "react-toastify"; // For notifications
import { useTranslation } from "react-i18next";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // Import icons for eye visibility toggle

const EditProfile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    desc: "",
    phone: "",
    country: "",
    img: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    yearsOfExperience: "",
  });

  // State to toggle password visibility
  const [passwordVisible, setPasswordVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  // Fetch the user profile
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await newRequest.get("/users/profile");
      return response.data;
    },
  });

  useEffect(() => {
    if (user) {
      setProfile({
        username: user.username || "",
        email: user.email || "",
        desc: user.desc || "",
        phone: user.phone || "",
        country: user.country || "",
        img: user.img || "", // Set the image URL if exists
        yearsOfExperience: user.yearsOfExperience || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = profile.img; // Use existing image if available

    // Upload image if a new file is selected
    if (file) {
      try {
        imageUrl = await upload(file); // Assuming upload returns the image URL
      } catch (err) {
        toast.error(t("errorUploadingImage"));
        return;
      }
    }

    // Check if the password is being updated and ensure it matches
    if (
      profile.newPassword &&
      profile.newPassword !== profile.confirmPassword
    ) {
      toast.error(t("passwordMismatch"));
      return;
    }

    // Prepare updated profile data
    const updatedProfile = {
      ...profile,
      img: imageUrl || "",
    };

    // Include the new password if it's provided
    if (profile.newPassword) {
      updatedProfile.password = profile.newPassword; // Add the new password to the update data
    }

    try {
      // Send the update request
      await newRequest.patch("/users/profile", updatedProfile);

      toast.success(t("profileUpdated"));
      navigate("/seller"); // Redirect after update
    } catch (err) {
      toast.error(err.response?.data.message || "Profile update failed");
    }
  };

  // Function to toggle password visibility
  const togglePasswordVisibility = (field) => {
    setPasswordVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading profile. Please try again later.</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold text-center text-gray-800 mb-8">
          {t("editProfile")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                {t("username")}
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={profile.username || ""}
                onChange={handleChange}
                className="w-full p-4 border rounded-md shadow-sm focus:ring-2 focus:ring-green-500"
                placeholder={t("usernamePlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {t("email")}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={profile.email || ""}
                onChange={handleChange}
                className="w-full p-4 border rounded-md shadow-sm focus:ring-2 focus:ring-green-500"
                placeholder={t("emailPlaceholder")}
              />
            </div>
          </div>

          {/* Password Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700"
              >
                {t("currentPassword")}
              </label>
              <div className="relative">
                <input
                  type={passwordVisible.currentPassword ? "text" : "password"}
                  id="currentPassword"
                  name="currentPassword"
                  value={profile.currentPassword || ""}
                  onChange={handleChange}
                  className="w-full p-4 border rounded-md shadow-sm focus:ring-2 focus:ring-green-500"
                  placeholder={t("currentPasswordPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("currentPassword")}
                  className="absolute right-4 top-4"
                >
                  {passwordVisible.currentPassword ? (
                    <FaEyeSlash className="text-gray-500" />
                  ) : (
                    <FaEye className="text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700"
              >
                {t("newPassword")}
              </label>
              <div className="relative">
                <input
                  type={passwordVisible.newPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={profile.newPassword || ""}
                  onChange={handleChange}
                  className="w-full p-4 border rounded-md shadow-sm focus:ring-2 focus:ring-green-500"
                  placeholder={t("newPasswordPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("newPassword")}
                  className="absolute right-4 top-4"
                >
                  {passwordVisible.newPassword ? (
                    <FaEyeSlash className="text-gray-500" />
                  ) : (
                    <FaEye className="text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                {t("confirmPassword")}
              </label>
              <div className="relative">
                <input
                  type={passwordVisible.confirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={profile.confirmPassword || ""}
                  onChange={handleChange}
                  className="w-full p-4 border rounded-md shadow-sm focus:ring-2 focus:ring-green-500"
                  placeholder={t("confirmPasswordPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                  className="absolute right-4 top-4"
                >
                  {passwordVisible.confirmPassword ? (
                    <FaEyeSlash className="text-gray-500" />
                  ) : (
                    <FaEye className="text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="desc"
                className="block text-sm font-medium text-gray-700"
              >
                {t("bio")}
              </label>
              <textarea
                id="desc"
                name="desc"
                value={profile.desc || ""}
                onChange={handleChange}
                rows="3"
                className="w-full p-4 border rounded-md shadow-sm focus:ring-2 focus:ring-green-500"
                placeholder={t("bioPlaceholder")}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              {t("phone")}
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={profile.phone || ""}
              onChange={handleChange}
              className="w-full p-4 border rounded-md shadow-sm focus:ring-2 focus:ring-green-500"
              placeholder={t("phonePlaceholder")}
            />
          </div>

          <div>
            <label
              htmlFor="img"
              className="block text-sm font-medium text-gray-700"
            >
              {t("profileImage")}
            </label>
            <input
              type="file"
              id="img"
              name="img"
              onChange={handleImageChange}
              className="w-full p-4 border rounded-md shadow-sm focus:ring-2 focus:ring-green-500"
            />
            {profile.img && typeof profile.img === "string" ? (
              <div className="mt-4 text-center">
                <img
                  src={
                    profile.img ||
                    "https://miamistonesource.com/wp-content/uploads/2018/05/no-avatar-25359d55aa3c93ab3466622fd2ce712d1.jpg"
                  }
                  alt="Profile"
                  className="w-32 h-32 object-cover rounded-full mx-auto"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <button
              type="submit"
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {t("saveProfile")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
