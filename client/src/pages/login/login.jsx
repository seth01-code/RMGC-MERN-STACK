import React, { useState, useEffect } from "react";
import { MdAlternateEmail } from "react-icons/md";
import { FaFingerprint } from "react-icons/fa";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import newRequest from "../../utils/newRequest";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { useTranslation } from "react-i18next"; // Import translation hook
import "./login.css";
import logo from "../../../assets/logoo.webp";
import backgroundImage from "../../../assets/images/wallpaper.png";

const Login = () => {
  const { t } = useTranslation(); // Initialize translation
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userCookie = Cookies.get("currentUser");
    if (userCookie) {
      localStorage.setItem("currentUser", userCookie);
      navigate("/");
    }
  }, [navigate]);

  const togglePasswordView = () => setShowPassword(!showPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await newRequest.post("/auth/login", { username, password });
      localStorage.setItem("currentUser", JSON.stringify(res.data));
  
      window.location.href = "/"; // Redirect & reload
    } catch (err) {
      setError(err.response ? err.response.data.message : err.message);
    }
  };
  

  return (
    <div
      className="w-full h-screen flex items-center justify-center bg-no-repeat bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="w-[90%] max-w-sm md:max-w-md lg:max-w-md p-5 bg-gray-900 flex-col flex items-center gap-3 rounded-xl shadow-slate-500 shadow-lg">
        <img
          src={logo}
          alt="logo"
          className="w-7 rounded-full object-cover md:w-14"
        />
        <h1 className="text-lg md:text-xl font-semibold text-white">
          {t("welcomeBack")}
        </h1>
        <p className="text-xs md:text-sm text-gray-500 text-center">
          {t("noAccount")}{" "}
          <Link to={`/register`}>
            <span className="text-white">{t("signUp")}</span>
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="w-full flex items-center gap-2 bg-gray-800 p-2 rounded-xl">
            <MdAlternateEmail className="text-white" />
            <input
              type="text"
              placeholder={t("username")}
              className="bg-transparent border-0 w-full outline-none text-white text-sm md:text-base"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="w-full flex items-center gap-2 bg-gray-800 p-2 rounded-xl relative">
            <FaFingerprint className="text-white" />
            <input
              type={showPassword ? "password" : "text"}
              placeholder={t("password")}
              className="bg-transparent border-0 w-full outline-none text-white text-sm md:text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {showPassword ? (
              <FaRegEyeSlash
                className="absolute right-5 cursor-pointer text-white"
                onClick={togglePasswordView}
              />
            ) : (
              <FaRegEye
                className="absolute right-5 cursor-pointer text-white"
                onClick={togglePasswordView}
              />
            )}
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            type="submit"
            className="w-full p-2 bg-blue-500 rounded-xl mt-3 hover:bg-blue-600 text-white text-sm md:text-base"
          >
            {t("login")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
