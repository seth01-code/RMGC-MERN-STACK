import React, { useState } from "react";
import newRequest from "../../utils/newRequest";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
// import { FaCcVisa } from "react-icons/fa"; // Payment icons

const Pay = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const { id } = useParams();
  // const history = useNavigate();
  const { t } = useTranslation();

  // Handle payment link generation when "Pay Now" is clicked
  const handlePayment = async (paymentMethod) => {
    try {
      if (!id) {
        setErrorMessage(t("gigIdMissing"));
        return;
      }

      setProcessing(true);
      let res;
      if (paymentMethod === "paystack") {
        res = await newRequest.post(`/orders/create-payment-intent/${id}`);
      }
      else if (paymentMethod === "flutterwave") {
        res = await newRequest.post(`/orders/create-flutterwave-intent/${id}`);
      }

      setTimeout(() => {
        window.location.href = res.data.paymentLink;
      }, 2000);

      setProcessing(false);
    } catch (err) {
      setProcessing(false);
      setErrorMessage(
        err.response?.data?.message || err.message || t("unknownError")
      );
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl p-6 bg-white bg-opacity-10 backdrop-blur-lg shadow-2xl rounded-2xl">
        {/* Header */}
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-white">
          {t("selectPaymentMethod")}
        </h2>
        <p className="text-center text-gray-300 mt-2 text-sm sm:text-base">
          {t("securePayment")}
        </p>

        {/* African Payment - Paystack */}
        <div
          onClick={() => handlePayment("paystack")}
          className="mt-6 cursor-pointer p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between bg-white bg-opacity-20 backdrop-blur-md shadow-lg hover:shadow-2xl hover:bg-opacity-30 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <img
              src="https://static-00.iconduck.com/assets.00/paystack-icon-512x504-w7v8l6as.png"
              alt="Paystack"
              className="w-8 h-8 sm:w-10 sm:h-10"
            />
            <span className="text-white text-sm sm:text-lg font-medium">
              {t("payWithPaystack")}
            </span>
          </div>
          <div className="flex gap-2 mt-3 sm:mt-0">
            <img
              src="https://logolook.net/wp-content/uploads/2023/09/Visa-Logo.png"
              alt="Visa"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
            <img
              src="https://cdn.prod.website-files.com/64199d190fc7afa82666d89c/648b606d4a139591f6b3440c_mastercard-1.png"
              alt="Mastercard"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Verve_Image.png/1200px-Verve_Image.png"
              alt="Verve"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
          </div>
        </div>

        {/* International Payment - Flutterwave */}
        <div
          onClick={() => handlePayment("flutterwave")}
          className="mt-4 cursor-pointer p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between bg-white bg-opacity-20 backdrop-blur-md shadow-lg hover:shadow-2xl hover:bg-opacity-30 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <img
              src="../../../assets/images/images-removebg-preview.png"
              alt="Flutterwave"
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
            <span className="text-white text-sm sm:text-lg font-medium">
              {t("payWithFlutterwave")}
            </span>
          </div>
          <div className="flex gap-2 mt-3 sm:mt-0">
            <img
              src="https://logolook.net/wp-content/uploads/2023/09/Visa-Logo.png"
              alt="Visa"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
            <img
              src="https://cdn.prod.website-files.com/64199d190fc7afa82666d89c/648b606d4a139591f6b3440c_mastercard-1.png"
              alt="Mastercard"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
            <img
              src="https://webshoptiger.com/wp-content/uploads/2023/09/American-Express-Color-1024x576.png"
              alt="American Express"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {processing && (
          <div className="mt-4 flex justify-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 p-3 text-red-500 text-xs sm:text-sm bg-red-100 rounded-lg text-center">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pay;
