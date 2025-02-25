import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import newRequest from "../../utils/newRequest";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const OTPVerification = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { t } = useTranslation();

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(120);
  const [otpExpired, setOtpExpired] = useState(false);
  const [timerId, setTimerId] = useState(null);
  const [email, setEmail] = useState(localStorage.getItem("email") || "");

  useEffect(() => {
    const queryEmail = new URLSearchParams(search).get("email");

    if (queryEmail) {
      setEmail(queryEmail);
      localStorage.setItem("email", queryEmail); // Store email in localStorage
    } else if (!email) {
      toast.error("Email is missing, please restart the verification process.");
      navigate("/register");
    }

    startTimer();

    return () => {
      clearInterval(timerId);
    };
  }, [search]);

  const startTimer = () => {
    if (timerId) clearInterval(timerId);

    setTimeLeft(120);
    setOtpExpired(false);

    const newTimerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(newTimerId);
          setOtpExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimerId(newTimerId);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email is missing. Please restart the process.");
      return;
    }

    try {
      await newRequest.post("/auth/verify-otp", { email, otp });

      toast.success(t("otpVerifiedSuccess"));
      localStorage.removeItem("email"); // Clear email after successful verification
      navigate("/terms-privacy");
    } catch (err) {
      toast.error(err.response?.data || "Invalid OTP, please try again.");
    }
  };

  const handleResendOTP = async () => {
    try {
      // Retrieve email from localStorage
      const storedEmail = localStorage.getItem("email");
  
      if (!storedEmail) {
        toast.error("Email is missing! Please restart the verification process.");
        return;
      }
  
      // Send request to resend OTP
      const response = await newRequest.post("/auth/resend-otp", { email: storedEmail, otp });
  
      if (response.status === 200) {
        toast.success("A new OTP has been sent to your email.");
        startTimer(); // Restart the countdown timer
      }
    } catch (err) {
      console.error("Error resending OTP:", err);
      toast.error(err.response?.data || "Failed to resend OTP. Please try again.");
    }
  };
  

  return (
    <div className="flex items-center justify-center min-h-screen text-black">
      <div className="w-[420px] bg-gray-800 shadow-2xl shadow-black rounded-lg p-6 flex flex-col gap-5">
        <h2 className="text-2xl font-bold text-center text-green-400 tracking-wide">
          {t("verifyYourAccount")}
        </h2>

        <p className="text-gray-300 text-center">
          {t("enterOTPMessage")} <strong className="text-white">{email}</strong>
        </p>

        <div className="flex justify-center text-lg font-semibold text-gray-400">
          {t("otpExpiresIn")}:{" "}
          <span className="ml-1">{formatTime(timeLeft)}</span>
        </div>

        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder={t("enterOTP")}
          className="p-3 border border-gray-400 bg-gray-700 rounded-md text-center text-lg tracking-widest text-white placeholder-gray-300 focus:ring-2 focus:ring-gray-500"
          maxLength="6"
        />

        <button
          type="submit"
          onClick={handleVerifyOTP}
          className="bg-green-500 hover:bg-green-600 text-gray-900 font-semibold py-2 rounded-md transition duration-300"
        >
          {t("verifyOTP")}
        </button>

        {otpExpired && (
          <div className="text-center mt-3">
            <span className="text-gray-400">{t("otpExpiredMessage")}</span>
            <Link
              to="#"
              onClick={handleResendOTP}
              className="text-green-400 hover:underline font-semibold ml-2"
            >
              {t("resendOTP")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OTPVerification;
