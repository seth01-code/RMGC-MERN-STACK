import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import newRequest from "../../utils/newRequest";
import { IoLogOutOutline } from "react-icons/io5";
import { MdArrowDropDown, MdOutlineAdd } from "react-icons/md";
import Flag from "react-world-flags";
import { HiOutlineShoppingCart } from "react-icons/hi";
import { TbMessages } from "react-icons/tb";

function SellerNavbar() {
  const { t, i18n } = useTranslation();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const closeMenu = () => {
    setLanguageOpen(false);
    setProfileOpen(false);
  };

  // const { pathname } = useLocation();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    try {
      await newRequest.post("/auth/logout");
      localStorage.removeItem("currentUser");
      setCurrentUser(null);
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setLanguageOpen(false);
  };

  const getFlagCode = () => {
    switch (i18n.language) {
      case "en":
        return "GB";
      case "es":
        return "ES";
      case "fr":
        return "FR";
      default:
        return "GB";
    }
  };

  return (
    <div className="relative px-4 top-0 bg-gray-900 text-white">
      <div className="container mx-auto flex justify-between items-center py-5 max-w-[1400px]">
        <div className="logo text-[34px] font-bold font-roboto">
          <Link to={"/"}>
            RMGC<span className="text-[#1dbfb7]">.</span>
          </Link>
        </div>

        {/* Desktop and Mobile View */}
        <div className="flex justify-center items-center gap-6 font-medium w-full md:w-auto">
          {/* Language Dropdown */}
          <div
            className="relative cursor-pointer"
            onClick={() => setLanguageOpen(!languageOpen)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl text-white">
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
              <div className="absolute top-12  md:right-0 sm:right-0 p-5 bg-gradient-to-r from-[#000000] to-[#130F40] rounded-lg shadow-lg border flex flex-col gap-4 text-white w-[220px] transition-all ease-in-out transform sm:translate-x-[15px] md:translate-x-0">
                <button
                  onClick={() => handleLanguageChange("en")}
                  className="p-2 flex items-center gap-2 hover:bg-white hover:text-[#1dbfb7] transition-all duration-300 rounded-md"
                >
                  <Flag code="GB" style={{ width: "20px", height: "15px" }} />{" "}
                  {t("navbar.english")}
                </button>
                <button
                  onClick={() => handleLanguageChange("es")}
                  className="p-2 flex items-center gap-2 hover:bg-white hover:text-[#1dbfb7] transition-all duration-300 rounded-md"
                >
                  <Flag code="ES" style={{ width: "20px", height: "15px" }} />{" "}
                  {t("navbar.spanish")}
                </button>
                <button
                  onClick={() => handleLanguageChange("fr")}
                  className="p-2 flex items-center gap-2 hover:bg-white hover:text-[#1dbfb7] transition-all duration-300 rounded-md"
                >
                  <Flag code="FR" style={{ width: "20px", height: "15px" }} />{" "}
                  {t("navbar.french")}
                </button>
              </div>
            )}
          </div>

          {/* Profile and Logout */}
          {currentUser ? (
            <div
              className="relative cursor-pointer"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <div className="flex items-center gap-2">
                <img
                  src={
                    currentUser.img ||
                    "https://miamistonesource.com/wp-content/uploads/2018/05/no-avatar-25359d55aa3c93ab3466622fd2ce712d1.jpg"
                  }
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span>{currentUser.username}</span>
              </div>
              {profileOpen && (
                <div className="absolute top-12 right-0 md:right-0 sm:right-10 p-5 bg-gradient-to-r from-[#000000] to-[#130F40] rounded-lg shadow-lg border flex flex-col gap-4 text-white w-[220px] transition-all ease-in-out">
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
                    </>
                  )}
                  <button
                    className="flex items-center p-2 hover:bg-white hover:text-[#1dbfb7] rounded-md transition-all duration-300"
                    onClick={handleLogout}
                  >
                    <IoLogOutOutline className="text-lg" /> {t("navbar.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-white hover:text-orange-400"
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

export default SellerNavbar;
