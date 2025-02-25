import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import newRequest from "../../utils/newRequest";
import { MdCheckCircle } from "react-icons/md"; // Success icon
import { useTranslation } from "react-i18next";

const Success = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const payment_intent = params.get("payment_intent");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const makeRequest = async () => {
      try {
        await newRequest.put("/orders", { payment_intent });

        // Keep success message for 5 seconds
        setTimeout(() => {
          setIsRedirecting(true);

          // After another 5 seconds, navigate to orders
          setTimeout(() => {
            navigate("/orders");
          }, 5000);
        }, 5000);
      } catch (err) {
        console.log(err);
      }
    };

    if (payment_intent) {
      makeRequest();
    } else {
      navigate("/orders");
    }
  }, [payment_intent, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="flex justify-center mb-6">
          <MdCheckCircle className="text-green-500" size={64} />
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-4">{t("paymentSuccessful")}</h1>
        <p className="text-gray-600 mb-6">
          {t("paymentProcessed")}
        </p>

        {isRedirecting && (
          <div className="text-gray-500 text-sm">
            <p>{t("notRedirected")}</p>
            <button
              onClick={() => navigate("/orders")}
              className="mt-4 px-6 py-2 bg-[#1dbf73] text-white rounded-md text-lg font-semibold transition-all hover:bg-green-600"
            >
              {t("goToOrders")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Success;
