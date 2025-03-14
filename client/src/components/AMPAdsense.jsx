import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const AMPAdsense = () => {
  const location = useLocation();

  // Define the pages where ads should appear
  const allowedRoutes = ["/", "/admin", "/seller", "/about-us", "/login"]; // Add your allowed pages

  useEffect(() => {
    if (!allowedRoutes.includes(location.pathname)) {
      return; // Don't load the ad script on non-allowed pages
    }

    // Add AMP script to <head> if not already added
    if (!document.querySelector('script[custom-element="amp-auto-ads"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.setAttribute("custom-element", "amp-auto-ads");
      script.src = "https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js";
      document.head.appendChild(script);
    }

    // Create the <amp-auto-ads> element dynamically
    const ampAutoAds = document.createElement("amp-auto-ads");
    ampAutoAds.setAttribute("type", "adsense");
    ampAutoAds.setAttribute("data-ad-client", "ca-pub-8713973295876975");

    // Append it to the body
    document.body.prepend(ampAutoAds);

    return () => {
      // Remove the ad tag when navigating away
      if (document.body.contains(ampAutoAds)) {
        document.body.removeChild(ampAutoAds);
      }
    };
  }, [location.pathname]);

  return null; // No UI needed, just injects scripts
};

export default AMPAdsense;
