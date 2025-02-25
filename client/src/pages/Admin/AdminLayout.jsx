import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import AdminNavbar from "./AdminNavbar.jsx"; // Add an Admin Navbar component
import AdminFooter from "./AdminFooter.jsx"; // Add an Admin Footer component

const AdminLayout = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Navbar */}
      <AdminNavbar />

      {/* Page Content */}
      <div className="flex-1 flex flex-col p-6 overflow-auto">
        <Outlet />
      </div>

      {/* Footer */}
      <div className="mt-auto">
        <AdminFooter />
      </div>
    </div>
  );
};

export default AdminLayout;
