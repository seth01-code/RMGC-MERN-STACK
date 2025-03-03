import React, { useState } from "react";
import upload from "../../utils/upload";
import newRequest from "../../utils/newRequest";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

function RegisterFreelancer() {
  const [file, setFile] = useState(null);
  // const [portfolioLink, setPortfolioLink] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [services, setServices] = useState([]); // New field for services

  const [user, setUser] = useState({
    username: "",
    fullName: "",
    dob: "",
    address: "",
    phone: "",
    country: "",
    email: "",
    password: "",
    profilePicture: "",
    yearsOfExperience: "",
    stateOfResidence: "",
    countryOfResidence: "",
    isSeller: true,
    desc: "",
    nextOfKin: {
      fullName: "",
      dob: "",
      stateOfResidence: "",
      countryOfResidence: "",
      email: "",
      address: "",
      phone: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Always update the state
    setUser((prev) => ({ ...prev, [name]: value }));

    // Age restriction for DOB
    if (name === "dob") {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();

      // Check if birthday has occurred this year
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--; // Adjust age if birthday hasn’t happened yet this year
      }

      if (age < 18) {
        toast.error("You must be at least 18 years old to register.");
        setUser((prev) => ({ ...prev, dob: "" })); // Clear invalid DOB
      }
    }
  };

  const handleNextOfKinChange = (e) => {
    setUser((prev) => ({
      ...prev,
      nextOfKin: { ...prev.nextOfKin, [e.target.name]: e.target.value },
    }));
  };

  // const handlePortfolioInput = (e) => {
  //   const values = e.target.value
  //     .split(",")
  //     .map((link) => link.trim())
  //     .filter((link) => link);
  //   setPortfolioLink(values);
  // };

  const handleLanguagesInput = (e) => {
    const values = e.target.value
      .split(",")
      .map((lang) => lang.trim())
      .filter((lang) => lang);
    setLanguages(values);
  };

  // New function to handle services input
  const handleServicesInput = (e) => {
    const values = e.target.value
      .split(",")
      .map((service) => service.trim())
      .filter((service) => service);
    setServices(values);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = user.profilePicture;

    if (file) {
      try {
        const uploadedImage = await upload(file);
        imageUrl = uploadedImage?.url || "";
      } catch (err) {
        toast.error(t("errorUploadingImage"));
        return;
      }
    }

    const userData = {
      ...user,
      img: imageUrl,
      // portfolioLink,
      languages,
      services, // Include services in request
    };

    try {
      await newRequest.post("/auth/register", userData);
      navigate(`/verify-otp?email=${user.email}`);
    } catch (err) {
      toast.error(err.response?.data || "Registration failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white rounded-lg p-6 flex flex-col gap-4"
      >
        <h1 className="text-3xl font-bold text-gray-700 text-center">
          {t("registerAsFreelancer")}
        </h1>

        {/* Full Name */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">{t("fullName")}</label>
          <input
            name="fullName"
            type="text"
            placeholder={t("fullNamePlaceholder")}
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Username */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">{t("username")}</label>
          <input
            name="username"
            type="text"
            placeholder={t("usernamePlaceholder")}
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">{t("email")}</label>
          <input
            name="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-3">
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
        </div>

        {/* Date of Birth */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">{t("dob")}</label>
          <input
            name="dob"
            type="date"
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Address */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">{t("address")}</label>
          <input
            name="address"
            type="text"
            placeholder={t("addressPlaceholder")}
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">{t("phone")}</label>
          <input
            name="phone"
            type="text"
            placeholder={t("phonePlaceholder")}
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Country */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">
            {t("countryOfResidence")}
          </label>
          <input
            name="country"
            type="text"
            placeholder={t("countryOfResidence")}
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* State of Residence */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">
            {t("stateOfResidence")}
          </label>
          <input
            name="stateOfResidence"
            type="text"
            placeholder={t("stateOfResidencePlaceholder")}
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Profile Picture */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">
            {t("profilePicture")}
          </label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="p-2 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
          />
        </div>

        {/* Portfolio Links */}
        {/* <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">
            {t("portfolioLinks")}
          </label>
          <input
            type="text"
            placeholder={t("pressEnterToAdd")}
            onChange={handlePortfolioInput}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <div className="flex flex-wrap gap-2">
            {portfolioLink.map((link, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm max-w-full md:max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap"
                title={link} // Shows full link on hover
              >
                {link}
              </span>
            ))}
          </div>
        </div> */}

        {/* Languages */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">{t("language1")}</label>
          <input
            type="text"
            placeholder={t("pressEnterToAdd2")}
            onChange={handleLanguagesInput}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <div className="flex flex-wrap gap-2">
            {languages.map((lang, index) => (
              <span
                key={index}
                className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm max-w-full md:max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                title={lang}
              >
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">{t("services")}</label>
          <input
            type="text"
            placeholder={t("pressEnterToAddServices")}
            onChange={handleServicesInput}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <div className="flex flex-wrap gap-2">
            {services.map((service, index) => (
              <span
                key={index}
                className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm max-w-full md:max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap"
                title={service}
              >
                {service}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">
            {t("yearsOfExperience")}
          </label>
          <input
            name="yearsOfExperience"
            type="text"
            placeholder={t("yearsOfExperiencePlaceholder")}
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Bio (Description) */}
        <div className="flex flex-col gap-3">
          <label className="font-medium text-gray-600">{t("bio")}</label>
          <textarea
            name="desc"
            placeholder={t("bioPlaceholder")}
            onChange={handleChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Next of Kin */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-gray-700">
            {t("nextOfKin")}
          </h2>
          <label className="font-medium text-gray-600">
            {t("nextOfKinName")}
          </label>
          <input
            name="fullName"
            type="text"
            placeholder={t("nextOfKinFullName")}
            onChange={handleNextOfKinChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <label className="font-medium text-gray-600">
            {t("nextOfKinPhone")}
          </label>
          <input
            name="phone"
            type="text"
            placeholder={t("nextOfKinPhonePlaceholder")}
            onChange={handleNextOfKinChange}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Submit Button */}
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

export default RegisterFreelancer;
