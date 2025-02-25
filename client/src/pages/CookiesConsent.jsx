import React, { useState, useEffect } from 'react';

const CookiesConsent = () => {
  const [showConsent, setShowConsent] = useState(false);

  // Check if consent was previously given
  useEffect(() => {
    const consentGiven = sessionStorage.getItem('cookieConsent');
    if (!consentGiven) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    sessionStorage.setItem('cookieConsent', 'true');
    setShowConsent(false);
  };

  const handleDecline = () => {
    sessionStorage.setItem('cookieConsent', 'false');
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div
        className="bg-white p-6 rounded-lg shadow-lg w-full sm:w-3/4 md:w-1/2 lg:w-1/3 max-w-md transform transition-transform duration-500 ease-out translate-y-16"
        style={{
          transform: showConsent ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        <h2 className="text-2xl font-semibold text-center mb-4">Cookies Notice</h2>
        <p className="text-gray-600 text-sm mb-6">
          We use cookies to improve your experience on our website. By continuing to browse, you agree to our use of cookies. Read our{' '}
          <a href="/terms-privacy" className="text-blue-500 hover:underline">Terms & Privacy Policy</a> for more information.
        </p>
        <div className="flex justify-between">
          <button
            onClick={handleDecline}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg transition duration-200 hover:bg-gray-300"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg transition duration-200 hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookiesConsent;
