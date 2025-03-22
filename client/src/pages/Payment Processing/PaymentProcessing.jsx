import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

const PaymentProcessing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Verifying payment...");

  useEffect(() => {
    const transactionId = searchParams.get("transaction_id");

    if (!transactionId) {
      setStatusMessage("Invalid transaction. Redirecting...");
      setTimeout(() => navigate("/orders"), 3000);
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await axios.get(
          `https://api.renewedmindsglobalconsult.com/api/orders/verify?transaction_id=${transactionId}`
        );
        setStatusMessage(response.data.message);

        setTimeout(() => {
          navigate("/orders");
        }, 3000);
      } catch (error) {
        setStatusMessage("Payment verification failed. Redirecting...");
        setTimeout(() => navigate("/orders"), 3000);
      }
    };

    verifyPayment();
  }, [navigate, searchParams]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-xl border border-gray-200 text-center">
        <h2 className="text-2xl font-semibold text-gray-800">
          Processing Payment...
        </h2>
        <p className="text-gray-600 mt-2">{statusMessage}</p>

        <div className="flex justify-center mt-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-gray-300 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          This might take a few seconds. We appreciate your patience!
        </p>
      </div>
    </div>
  );
};

export default PaymentProcessing;
