import React from "react";
import facebook from "../../../assets/images/facebook.png";
import linkedin from "../../../assets/images/linkedin.png";
import instagram from "../../../assets/images/instagram.png";
import language from "../../../assets/images/language.png";
import Accessibility from "../../../assets/images/accessibility.png";
import { useTranslation } from "react-i18next";
import { FcCurrencyExchange } from "react-icons/fc";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import moment from "moment";
import { useQuery } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import { FaTiktok } from "react-icons/fa";
import { SiGmail } from "react-icons/si";
import BackgroundVideo from "../../../assets/images/background.mp4"; // Import video
import Logo from "../../../assets/logoo.webp";

const Footer = () => {
  const { t } = useTranslation();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const { countryCurrency } = useExchangeRate(currentUser?.country);

  const { data } = useQuery({
    queryKey: ["authenticatedUser"],
    queryFn: () => newRequest.get("/users/me").then((res) => res.data),
  });

  const date = moment(data?.createdAt).format("YYYY");

  return (
    <footer className="relative text-gray-100 py-12">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src={BackgroundVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay to darken the video */}
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 z-10"></div>

      {/* Content */}
      <div className="relative container mx-auto px-6 md:px-12 lg:px-20 z-20">
        {/* Top Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Logo Section */}
          <div className="flex flex-col space-y-4">
            <img
              className="w-24 rounded-lg"
              src={Logo}
              alt="Renewed Minds Logo"
            />
          </div>

          {/* About Section */}
          <div>
            <h2 className="text-lg font-semibold">{t("footer.aboutUs")}</h2>
            <p className="text-sm font-light mt-4 leading-relaxed">
              {t("footer.aboutText")}
            </p>
          </div>

          {/* Support Section */}
          <div>
            <h2 className="text-lg font-semibold">{t("footer.support")}</h2>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  href="/terms-privacy"
                  className="text-sm font-light hover:text-gray-300 transition"
                >
                  {t("footer.privacyPolicy")}
                </a>
              </li>
              <li>
                <a
                  href="/terms-privacy"
                  className="text-sm font-light hover:text-gray-300 transition"
                >
                  {t("footer.termsOfService")}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h2 className="text-lg font-semibold">{t("footer.contact")}</h2>
            <p className="text-sm font-light mt-4">
              {t("footer.email")}:{" "}
              <a
                href="mailto:support@renewedmindsglobalconsult.com"
                className="text-blue-500"
              >
                support@renewedmindsglobalconsult.com
              </a>
            </p>
            <p className="text-sm font-light">
              {t("footer.address")}: 10, Orija Street, Lagos, Nigeria.
            </p>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-12 border-gray-500 opacity-50" />

        {/* Bottom Section */}
        <div className="flex flex-wrap justify-between items-center gap-5">
          {/* Left - Branding & Copyright */}
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">RMGC</h2>
            <span className="text-sm">{`© Renewed Minds Global Consult, ${date}`}</span>
          </div>

          {/* Right - Socials, Language, Currency, Accessibility */}
          <div className="flex flex-wrap items-center gap-6">
            {/* Social Media Icons with Links */}
            <div className="flex items-center space-x-4">
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaTiktok className="text-[1.5rem] text-gray-400 transition hover:scale-110" />
              </a>
              <img
                src={facebook}
                alt="Facebook"
                className="w-6 h-6 transition hover:scale-110"
              />
              <img
                src={linkedin}
                alt="LinkedIn"
                className="w-6 h-6 transition hover:scale-110"
              />
              <a href="mailto:support@renewedmindsglobalconsult.com">
                <SiGmail className="text-[1.5rem] text-gray-400 transition hover:scale-110" />
              </a>
              <a
                href="https://www.instagram.com/rmgconsult_?igsh=dDNhbW1yeHRkNWw4"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={instagram}
                  alt="Instagram"
                  className="w-6 h-6 transition hover:scale-110"
                />
              </a>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <img src={language} alt="language" className="w-6 h-6" />
              <span>{t("footer.english")}</span>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <FcCurrencyExchange className="text-2xl" />
              <span>{countryCurrency}</span>
            </div>

            {/* Accessibility */}
            <img
              src={Accessibility}
              alt="Accessibility"
              className="w-6 h-6 hover:scale-110 transition"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
