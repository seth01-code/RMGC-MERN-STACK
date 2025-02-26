import React, { useState, useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useLocation,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminMessages from "./pages/Admin/AdminMessages";
import MessageDetail from "./pages/Admin/MessageDetail";
import Home from "./pages/home/Home";
import Navbar from "./components/navbar/Navbar";
import Footer from "./components/footer/Footer.jsx";
import Gigs from "./pages/gigs/Gigs";
import Gig from "./pages/gig/Gig";
import MyGigs from "./pages/myGigs/MyGigs";
import Orders from "./pages/Orders/Orders";
import Add from "./pages/add/Add";
import Login from "./pages/login/login.jsx";
import Register from "./pages/register/Register";
import Pay from "./pages/Pay/Pay";
import Success from "./pages/success/Success";
import Sellers from "./pages/Admin/Sellers";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./i18n";
import SellerDashboard from "./pages/Seller/SellerDashboard";
import PaymentProcessing from "./pages/Payment Processing/PaymentProcessing";
import SellerLayout from "./pages/Seller/SellerLayout";
import Preloader from "./components/Preloader/Preloader.jsx";
import OTPVerification from "./pages/register/OTPVerification.jsx";
import TermsPrivacy from "./pages/TermsPrivacy.jsx";
import AllGig from "./pages/AllGigs/AllGig.jsx";
// import { ChatProvider } from "./context/chatContext.jsx";
import GigDetail from "./pages/Seller/GigDetail.jsx";
// import ChatApp from "./pages/chat/chatApp.jsx";
import AboutUs from "./pages/About/AboutUs.jsx";
import EditProfile from "./pages/Seller/EditProfile.jsx";
import CookiesConsent from "./pages/CookiesConsent.jsx"; // Import CookiesConsent;
import AOS from "aos"; // Import AOS
import "aos/dist/aos.css";
import ChatPage from "./pages/ChatPage/ChatPage.jsx";
import Announcements from "./Announcements.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";

const queryClient = new QueryClient();

const App = () => {
  const [loading, setLoading] = useState(true); // ✅ Always start with loading state

  useEffect(() => {
    // ✅ Initialize AOS animations
    AOS.init({
      duration: 1000,
      easing: "ease-in-out",
      once: false,
    });

    // ✅ Remove session data if user logs out
    const handleStorageChange = () => {
      if (!localStorage.getItem("currentUser")) {
        sessionStorage.clear();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // ✅ Show preloader when app is loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 2000); // ⏳ Adjust timeout if needed

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="preloader-container flex items-center justify-center h-screen bg-white">
        <Preloader />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastContainer
        position="top-center" // Positioning it at the top center
        autoClose={3000} // Duration before the toast disappears
        hideProgressBar={false} // Show the progress bar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        className="dark-toast-container overflow-hidden"
      />
      <CookiesConsent /> {/* Inserted here */}
    </QueryClientProvider>
  );
};

// 🟢 General Layout (Main Pages)

// 🟢 Get current user data
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
const isSeller = currentUser?.isSeller;
const isAdmin = currentUser?.isAdmin;

// 🛑 Protected Route Component
const ProtectedRoute = ({ allowedRoles, children }) => {
  if (!currentUser) return <Navigate to="/" replace />;
  if (!allowedRoles.includes("admin") && isAdmin)
    return <Navigate to="/" replace />;
  if (!allowedRoles.includes("seller") && isSeller)
    return <Navigate to="/" replace />;
  if (!allowedRoles.includes("user") && !isSeller && !isAdmin)
    return <Navigate to="/" replace />;

  return children;
};
const Layout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const isRegister = location.pathname === "/register";
  const isTerms = location.pathname === "/terms-privacy";
  const isOTP = location.pathname === "/verify-otp";
  const isMessage = location.pathname === "/chat";
  const isForgotPassword = location.pathname === "/forgot-password";
  const isPay = location.pathname.startsWith("/pay/");
  const isResetPassword = location.pathname.startsWith("/reset-password/");
  const isProcessing = location.pathname.startsWith("/payment-processing");

  const [showAnnouncement, setShowAnnouncement] = useState(true);

  useEffect(() => {
    // Set a timer to hide the announcement after 2 minutes (120000ms)
    const timer = setTimeout(() => {
      setShowAnnouncement(false);
    }, 300000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app">
      {!isLoginPage &&
        !isRegister &&
        !isMessage &&
        !isTerms &&
        !isPay &&
        !isProcessing &&
        !isOTP &&
        !isForgotPassword &&
        !isResetPassword && (
          <>
            {showAnnouncement && <Announcements />}
            <Navbar />
          </>
        )}
      <Outlet />
      {!isLoginPage &&
        !isRegister &&
        !isMessage &&
        !isTerms &&
        !isPay &&
        !isProcessing &&
        !isOTP &&
        !isForgotPassword &&
        !isResetPassword && <Footer />}
    </div>
  );
};

const userId = currentUser?.id;

// 🟢 Router Setup
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/allgigs", element: <AllGig /> },
      { path: "/gigs", element: <Gigs /> },
      {
        path: "/gig/:id",
        element: (
          <ProtectedRoute allowedRoles={["user"]}>
            <Gig />
          </ProtectedRoute>
        ),
      },
      {
        path: "/orders",
        element: (
          <ProtectedRoute allowedRoles={["user", "seller"]}>
            <Orders />
          </ProtectedRoute>
        ),
      },
      {
        path: "/mygigs",
        element: (
          <ProtectedRoute allowedRoles={["seller"]}>
            <MyGigs />
          </ProtectedRoute>
        ),
      },
      {
        path: "/add",
        element: (
          <ProtectedRoute allowedRoles={["seller"]}>
            <Add />
          </ProtectedRoute>
        ),
      },
      { path: "/login", element: <Login /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password/:token", element: <ResetPasswordPage /> },
      { path: "/register", element: <Register /> },
      {
        path: "/pay/:id",
        element: (
          <ProtectedRoute allowedRoles={["user"]}>
            <Pay />
          </ProtectedRoute>
        ),
      },
      { path: "/success", element: <Success /> },
      { path: "/verify-otp", element: <OTPVerification /> },
      {
        path: "/payment-processing",
        element: (
          <ProtectedRoute allowedRoles={["user"]}>
            <PaymentProcessing />
          </ProtectedRoute>
        ),
      },
      { path: "/terms-privacy", element: <TermsPrivacy /> },
      {
        path: "/chat",
        element: (
          <ProtectedRoute allowedRoles={["user", "seller"]}>
            <ChatPage userId={userId} />
          </ProtectedRoute>
        ),
      },
      { path: "/about-us", element: <AboutUs /> },
    ],
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "", element: <AdminDashboard /> },
      { path: "messages", element: <AdminMessages /> },
      { path: "messages/:id", element: <MessageDetail /> },
      { path: "sellers", element: <Sellers /> },
      { path: "gigdetails/:id", element: <GigDetail /> },
    ],
  },
  {
    path: "/seller",
    element: (
      <ProtectedRoute allowedRoles={["seller"]}>
        <SellerLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "", element: <SellerDashboard /> },
      { path: "gigdetails/:id", element: <GigDetail /> },
      { path: "profile-edit", element: <EditProfile /> },
    ],
  },
]);

export default App;
