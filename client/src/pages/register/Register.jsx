import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import RegisterClient from "./RegisterClient";
import RegisterFreelancer from "./RegisterFreelancer";
import RegisterAdmin from "./RegisterAdmin.jsx";
import { useTranslation } from "react-i18next";
import video from "../../../assets/images/reg.mp4"; // Import video
import logo from "../../../assets/logoo.webp"; // Import logo
import { Link } from "react-router-dom";

const Register = () => {
  const [role, setRole] = useState("client"); // "client", "freelancer", or "admin"
  const { t } = useTranslation();
  const [fadeText, setFadeText] = useState([]);

  // Role-based main text
  const roleText = {
    client: "Join Renewed Minds Global Consult today as a client to access",
    freelancer:
      "Join Renewed Minds Global Consult today as a service provider to upload your services and gain access to",
    admin:
      "Join Renewed Minds Global Consult today as an admin to oversee operations and manage users with access to",
  };

  // Fade-in details text
  const detailsText = {
    client: [
      "Expert Service Providers",
      "Secure Transactions",
      "Personalized Services",
    ],
    freelancer: [
      "Potential Clients",
      "Powerful Service Tools",
      "Global Marketplace",
    ],
    admin: ["User Management", "Platform Analytics", "Seamless Control"],
  };

  // Update fadeText when role changes
  useEffect(() => {
    setFadeText(detailsText[role]);
  }, [role]);

  // Framer Motion variants for fade-in effect
  const fadeInVariant = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.5, duration: 0.6 },
    }),
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
  {/* Sidebar with Video Background */}
  <div className="relative p-7 w-full lg:w-1/3 lg:h-auto overflow-hidden flex flex-col justify-between">
    {/* Video Background */}
    <video
      autoPlay
      loop
      muted
      className="absolute top-0 left-0 w-full h-full object-cover"
    >
      <source src={video} type="video/mp4" />
    </video>

    {/* Overlay for better contrast */}
    <div className="absolute inset-0 bg-black/50"></div>

    {/* Logo & Role Selection */}
    <div className="relative z-10 flex flex-col items-center text-center mx-6 lg:mx-10 pt-10 lg:pt-20">
      {/* Logo */}
      <img
        src={logo}
        alt="Logo"
        className="w-28 h-28 rounded-full object-contain mb-6"
      />

      {/* Dynamic Role-Based Text */}
      <p className="text-white text-lg lg:text-2xl font-bold mb-4 px-4 lg:px-8 leading-relaxed">
        {roleText[role]}
      </p>

      {/* Framer Motion Fade-in Details Text */}
      <motion.div
        key={role} // Re-render on role change
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-2 items-center text-orange-400 text-lg lg:text-2xl font-semibold uppercase px-4 lg:px-8"
      >
        {fadeText.map((text, index) => (
          <motion.span
            key={index}
            variants={fadeInVariant}
            custom={index}
            className="inline-block"
          >
            {text}
          </motion.span>
        ))}
      </motion.div>

      {/* Role Selection Buttons (Row on mobile, Column on large screens) */}
      <div className="flex flex-row lg:flex-col gap-4 lg:gap-8 mt-6">
        {[
          { key: "client", label: t("registerAsClient") },
          { key: "freelancer", label: t("registerAsFreelancer") },
          { key: "admin", label: t("registerAsAdmin") },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`px-4 py-3 text-lg font-semibold rounded-lg border text-white transition-all duration-300 
              ${
                role === key
                  ? "bg-orange-500 text-white shadow-lg scale-105"
                  : "bg-transparent hover:bg-orange-500"
              }`}
            onClick={() => setRole(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    {/* Sign-in Link at the Bottom */}
    <div className="relative z-10 flex justify-center items-center pb-6">
      <p className="text-sm text-gray-300 text-center">
        Already have an account?{" "}
        <Link className="text-orange-500 font-semibold hover:underline" to={`/login`}>
          Sign In
        </Link>
      </p>
    </div>
  </div>

  {/* Main content area for the selected form */}
  <motion.div
    key={role} // Ensures animation plays on role change
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5 }}
    className="flex-1 p-6 flex justify-center items-center"
  >
    <div className="max-w-3xl mx-auto w-full rounded-lg p-6">
      {role === "client" && <RegisterClient />}
      {role === "freelancer" && <RegisterFreelancer />}
      {role === "admin" && <RegisterAdmin />}
    </div>
  </motion.div>
</div>

  );
};

export default Register;
