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

  // Check if the ad should be placed in the header or body
  if (document.querySelector("header")) {
    // Prevent ads from rendering in the header
    return null;
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-8713973295876975"
      data-ad-slot="5074558232"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  );
};

export default GoogleAd;
