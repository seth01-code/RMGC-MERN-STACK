import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TawkToChat = () => {
  const location = useLocation();
  const restrictedRoutes = ["/chat"]; // Hide on these routes

  useEffect(() => {
    if (restrictedRoutes.includes(location.pathname)) {
      return; // Don't load script on restricted pages
    }

    const script = document.createElement("script");
    script.src = "https://embed.tawk.to/67c2fa8bce30551910366794/1il8q5cs8";
    script.async = true;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    document.body.appendChild(script);

    script.onload = () => {
      if (window.Tawk_API) {
        // Hide the chat widget on page load
        window.Tawk_API.hide();
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [location.pathname]);

  return null;
};

export default TawkToChat;
