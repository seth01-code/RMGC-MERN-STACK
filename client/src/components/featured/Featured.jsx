import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
// import Man from "../../../assets/images/ok.png";
import Search from "../../../assets/images/search.png";
import BackgroundVideo from "../../../assets/images/serve.mp4"; // Import video
import { useTranslation } from "react-i18next";

function Featured() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const navigate = useNavigate();
  // const [displayedText, setDisplayedText] = useState("");
  const fullText = `${t("featured.title1")} ${t("featured.title2")} ${t(
    "featured.title3"
  )}`;

  const handleSubmit = () => {
    if (input.trim()) {
      navigate(`/gigs?search=${input}`);
    }
  };

  const handlePopularClick = (searchTerm) => {
    setInput(searchTerm);
    navigate(`/gigs?search=${searchTerm}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full h-auto lg:h-[600px] flex flex-col lg:flex-row justify-center text-white p-6">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src={BackgroundVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark Overlay for Better Readability */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/60"></div>

      <div className="relative max-w-[1400px] w-full flex flex-col lg:flex-row items-center lg:justify-between gap-8">
        {/* Left Section */}
        <div className="flex flex-col gap-8 w-full lg:w-1/2 order-last lg:order-none">
          <motion.h1
            className="text-3xl lg:text-5xl font-merienda text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }} // Starts slightly lower
            animate={{ opacity: 1, y: 0 }} // Moves up while fading in
            transition={{ duration: 1, ease: "easeOut" }} // Smooth transition
          >
            {fullText}
            <motion.span
              className="font-light"
              animate={{ opacity: [0, 1, 0] }} // Blinking effect
              transition={{ repeat: Infinity, duration: 0.6 }}
            ></motion.span>
          </motion.h1>

          <div className="flex items-center bg-white rounded-md w-full">
            <div className="flex items-center gap-2 px-4 py-2 flex-grow">
              <img
                src={Search}
                alt={t("featured.searchAlt")}
                className="w-5 h-5"
              />
              <input
                type="text"
                placeholder={t("featured.searchPlaceholder")}
                onChange={(e) => setInput(e.target.value)}
                value={input}
                onKeyDown={handleKeyDown}
                className="border-none outline-none w-full text-black"
              />
            </div>
            <button
              onClick={handleSubmit}
              className="w-[120px] h-[50px] bg-[#FF8C00] text-white cursor-pointer border-none rounded-r-md"
            >
              {t("featured.searchButton")}
            </button>
          </div>
          <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4">
            <span className="text-sm">{t("featured.popular")}:</span>
            {["Legal Services", "Graphic Design", "Writing"].map((term) => (
              <button
                key={term}
                onClick={() => handlePopularClick(term)}
                className="text-white bg-transparent border border-white py-1 px-3 rounded-full text-sm cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
        {/* Right Section (Image) */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end order-first lg:order-none">
          {/* <img
            src={Man}
            alt={t("featured.manAlt")}
            className="h-[300px] sm:h-[400px] md:h-[500px] lg:h-full object-cover max-w-full"
          /> */}
        </div>
      </div>
    </div>
  );
}

export default Featured;
