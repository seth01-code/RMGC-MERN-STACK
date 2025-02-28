import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import newRequest from "../../utils/newRequest";
// import { FiMenu, FiX } from "react-icons/fi";
import { IoLogOutOutline } from "react-icons/io5";
import { TbMessages } from "react-icons/tb";
import {
  MdArrowDropDown,
  MdOutlineAdd,
  MdAdminPanelSettings,
} from "react-icons/md";
import { HiOutlineShoppingCart } from "react-icons/hi";
import Flag from "react-world-flags";
import { FaTasks } from "react-icons/fa";
import { LuLayoutDashboard } from "react-icons/lu";
// import { toast } from "react-toastify";

function Navbar() {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [categories, setCategories] = useState([]);

  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setActive(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("currentUser"));
    setCurrentUser(storedUser);
  }, []);

  useEffect(() => {
    const browserLang = navigator.language.split("-")[0];
    const supportedLanguages = ["en", "es", "fr"];

    if (supportedLanguages.includes(browserLang)) {
      i18n.changeLanguage(browserLang);
    } else {
      i18n.changeLanguage("en");
    }
  }, [i18n]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await newRequest.get("/gigs");
        const gigs = response.data;
        const uniqueCategories = [...new Set(gigs.map((gig) => gig.cat))];
        setCategories(uniqueCategories);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const handleLogout = async () => {
    try {
      await newRequest.post("/auth/logout");
      localStorage.removeItem("currentUser");
      setCurrentUser(null); // Assuming you have a state for currentUser
      navigate("/login"); // Redirect to login page
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  // Detecting any 40X errors on API calls
  newRequest.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        handleLogout(); // Only logs out on unauthorized errors
      }
      return Promise.reject(error);
    }
  );

  const closeMenu = () => {
    setOpen(false);
    setCategoriesOpen(false);
    setLanguageOpen(false);
    setProfileOpen(false);
  };

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setLanguageOpen(false);
  };

  const getFlagCode = () => {
    switch (i18n.language) {
      case "en":
        return "GB"; // UK Flag for English
      case "es":
        return "ES"; // Spain Flag for Spanish
      case "fr":
        return "FR"; // France Flag for French
      default:
        return "GB"; // Default to UK flag
    }
  };

  return (
    <div
      className={`sticky px-4 top-0 z-50 transition-all duration-500 ${
        active || pathname !== "/"
          ? "bg-white text-black"
          : " bg-gradient-to-r from-black to-gray-800 text-white"
      }`}
    >
      <div className="container mx-auto flex justify-between items-center py-5 max-w-[1400px]">
        <div className="logo text-[34px] font-bold font-roboto">
          <Link to={"/"} onClick={closeMenu}>
            RMGC<span className="text-[#1dbfb7]">.</span>
          </Link>
        </div>

        {/* Desktop View */}
        <div className="flex items-center gap-6 font-medium">
          {currentUser?.isAdmin && (
            <>
              <Link to={`/admin`}>
                <MdAdminPanelSettings className="text-2xl" />
              </Link>
            </>
          )}
          {currentUser?.isSeller && (
            <>
              <Link to={`/seller`}>
                <LuLayoutDashboard className="text-2xl" />
              </Link>
            </>
          )}
          <div
            className="relative cursor-pointer"
            onClick={() => setLanguageOpen(!languageOpen)}
          >
            <div className="flex items-center gap-2 md:text-xl lg:text-xl">
              <span className="text-sm text-white">
                <Flag
                  code={getFlagCode()}
                  style={{ width: "20px", height: "15px" }}
                />
              </span>
              <span>
                <MdArrowDropDown />
              </span>
            </div>
            {languageOpen && (
              <div className="absolute top-12 right-0 p-5 bg-gradient-to-r from-[#000000] to-[#130F40] rounded-lg shadow-lg border flex flex-col justify-center items-center gap-4 text-white w-[100px] transition-all ease-in-out">
                <button
                  onClick={() => handleLanguageChange("en")}
                  className="p-2 flex items-center gap-2 hover:bg-white hover:text-[#1dbfb7] transition-all duration-300 rounded-md"
                >
                  <Flag code="GB" style={{ width: "20px", height: "15px" }} />
                </button>
                <button
                  onClick={() => handleLanguageChange("es")}
                  className="p-2 flex items-center gap-2 hover:bg-white hover:text-[#1dbfb7] transition-all duration-300 rounded-md"
                >
                  <Flag code="ES" style={{ width: "20px", height: "15px" }} />
                </button>
                <button
                  onClick={() => handleLanguageChange("fr")}
                  className="p-2 flex items-center gap-2 hover:bg-white hover:text-[#1dbfb7] transition-all duration-300 rounded-md"
                >
                  <Flag code="FR" style={{ width: "20px", height: "15px" }} />
                </button>
              </div>
            )}
          </div>
          {currentUser ? (
            <div
              className="relative cursor-pointer"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <div className="flex items-center gap-2">
                <img
                  src={currentUser.img || "/assets/images/noavatar.jpg"}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span>{currentUser.username}</span>
              </div>
              {profileOpen && (
                <div className="absolute top-12 right-0 p-5 bg-gradient-to-r from-[#000000] to-[#130F40] rounded-lg shadow-lg border flex flex-col gap-4 text-white w-[220px] transition-all ease-in-out">
                  {currentUser.isSeller && (
                    <>
                      <Link
                        to="/mygigs"
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={closeMenu}
                      >
                        <MdOutlineAdd className="text-lg" /> {t("navbar.Gigs")}
                      </Link>
                      <Link
                        to="/add"
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={closeMenu}
                      >
                        <MdOutlineAdd className="text-lg" />{" "}
                        {t("navbar.Add New Gig")}
                      </Link>
                      <Link
                        to="/orders"
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={closeMenu}
                      >
                        <HiOutlineShoppingCart className="text-lg" />{" "}
                        {t("navbar.orders")}
                      </Link>
                      <Link
                        to="/chat"
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={closeMenu}
                      >
                        <TbMessages className="text-lg" />{" "}
                        {t("navbar.messages")}
                      </Link>
                      <button
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={handleLogout}
                      >
                        <IoLogOutOutline className="text-lg" />{" "}
                        {t("navbar.logout")}
                      </button>
                    </>
                  )}
                  {!currentUser.isSeller && !currentUser.isAdmin && (
                    <>
                      <Link
                        to="/orders"
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={closeMenu}
                      >
                        <HiOutlineShoppingCart className="text-lg" />{" "}
                        {t("navbar.orders")}
                      </Link>

                      <Link
                        to="/allgigs"
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={closeMenu}
                      >
                        <FaTasks className="text-lg" /> {t("allGigs")}
                      </Link>
                      <Link
                        to="/chat"
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={closeMenu}
                      >
                        <TbMessages className="text-lg" />{" "}
                        {t("navbar.messages")}
                      </Link>
                      <button
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={handleLogout}
                      >
                        <IoLogOutOutline className="text-lg" />{" "}
                        {t("navbar.logout")}
                      </button>
                    </>
                  )}
                  {currentUser.isAdmin && (
                    <>
                      <Link
                        to="/admin/"
                        className={`text-white 
                         `}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/admin/messages"
                        className={`text-white ${
                          pathname.startsWith("/admin/messages") &&
                          "bg-green-500 w-40 h-10 rounded-lg items-center flex justify-center"
                        }`}
                      >
                        Messages
                      </Link>
                      <Link
                        to="/admin/sellers"
                        className={`text-white ${
                          pathname.startsWith("/admin/sellers") &&
                          "bg-green-500 w-40 h-10 rounded-lg items-center flex justify-center"
                        }`}
                      >
                        Sellers
                      </Link>
                      <button
                        className="flex items-center gap-3 p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                        onClick={handleLogout}
                      >
                        <IoLogOutOutline className="text-lg" />{" "}
                        {t("navbar.logout")}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className={`${
                  active || pathname !== "/"
                    ? "text-black hover:text-gray-500"
                    : "text-white hover:text-orange-400"
                }`}
                onClick={closeMenu}
              >
                {t("navbar.signIn")}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;
