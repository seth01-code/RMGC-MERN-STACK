"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

const TawkToChat = () => {
  const pathname = usePathname();
  const restrictedRoutes = ["/chat", "/login", "/register"];

  useEffect(() => {
    if (restrictedRoutes.includes(pathname)) return;

    if (document.getElementById("tawkScript")) return;

    const script = document.createElement("script");
    script.id = "tawkScript";
    script.src = "https://embed.tawk.to/67c2fa8bce30551910366794/1il8q5cs8";
    script.async = true;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);

    // CSS fallback to always hide default Tawk launcher
    const style = document.createElement("style");
    style.innerHTML = `
      #tawkchat-container, 
      iframe[src*="tawk.to"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    style.id = "tawkHideStyle";
    document.head.appendChild(style);

    script.onload = () => {
      const hideDefault = () => {
        if (window.Tawk_API) {
          window.Tawk_API.hideWidget();
        } else {
          setTimeout(hideDefault, 1000); // Retry until ready
        }
      };
      hideDefault();
    };

    return () => {
      script.remove();
      document.getElementById("tawkHideStyle")?.remove();
    };
  }, [pathname]);

  const handleOpenChat = () => {
    if (window.Tawk_API) {
      window.Tawk_API.showWidget();
      window.Tawk_API.maximize();
    }
  };

  return (
    <button
      onClick={handleOpenChat}
      aria-label="Chat with us"
      className="fixed bottom-6 right-6 z-[9999] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group"
    >
      <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
    </button>
  );
};

export default TawkToChat;
