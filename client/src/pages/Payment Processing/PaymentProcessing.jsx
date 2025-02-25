import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PaymentProcessing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Delay before navigating to the success page
    const timer = setTimeout(() => {
      navigate("/orders");
    }, 5000); // 5 seconds delay

    return () => clearTimeout(timer); // Cleanup on unmount
  }, [navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-xl border border-gray-200 text-center">
        {/* Payment Title */}
        <h2 className="text-2xl font-semibold text-gray-800">
          Processing Payment...
        </h2>
        <p className="text-gray-600 mt-2">
          Please wait while we confirm your payment.
        </p>

        {/* Loader Animation */}
        <div className="flex justify-center mt-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-gray-300 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Status Message */}
        <p className="text-sm text-gray-500 mt-4">
          This might take a few seconds. We appreciate your patience!
        </p>
      </div>
    </div>
  );
};

export default PaymentProcessing;
