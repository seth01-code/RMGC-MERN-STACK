import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GoogleAd = () => {
  const location = useLocation();

  useEffect(() => {
    // List of routes where the ad script should not load
    const excludedRoutes = [
      "/login",
      "/forgot-password",
      "/reset-password",
      "/register",
      "/pay",
      "/success",
      "/verify-otp",
      "/payment-processing",
      "/terms-privacy",
      "/chat",
    ];

    // Check if the current route is in the excluded routes list
    if (!excludedRoutes.some((route) => location.pathname.startsWith(route))) {
      // Dynamically add the Google Ads script to the page
      const script = document.createElement("script");
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8713973295876975";
      script.async = true;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);

      // Push the ad to the page once the script is loaded
      script.onload = () => {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      };

      return () => {
        // Clean up script when the component is unmounted
        document.body.removeChild(script);
      };
    }
  }, [location]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f2f2f2]">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-8713973295876975"
        data-ad-slot="5074558232"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default GoogleAd;
