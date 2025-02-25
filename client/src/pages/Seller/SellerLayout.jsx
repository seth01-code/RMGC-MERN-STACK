import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import SellerNavbar from "./SellerNavbar";
import SellerFooter from "./SellerFooter.jsx";

const SellerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      {/* Navbar - Keeping it unchanged */}
      <SellerNavbar />

      {/* Main Content Wrapper */}

      {/* Page Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>

      {/* Footer - Full width, under sidebar */}
      <div className="w-full">
        <SellerFooter />
      </div>
    </div>
  );
};

export default SellerLayout;
