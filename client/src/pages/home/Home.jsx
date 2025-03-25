import React from "react";
import Check from "../../../assets/images/check.png";
import BackgroundVideo from "../../../assets/images/call.mp4"; // Ensure this video file is present
import Featured from "../../components/featured/Featured";
import Slide from "../../components/Slide/Slide";
import Slider from "../../components/Slide/Slider";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion"; // Add framer-motion import
// import GoogleAd from "../../components/GoogleAd";

const Home = () => {
  const { t } = useTranslation();

  return (
    <div className="">
      <Featured />
      {/* <GoogleAd /> */}
      <Slider />
      {/* Features Section */}
      <div className="relative features py-16 md:py-24 lg:py-28 text-white">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          className="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source src={BackgroundVideo} type="video/mp4" />
        </video>

        {/* Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50"></div>

        <div
          {...(window.innerWidth >= 768 ? { "data-aos": "fade-up" } : {})}
          className="relative container max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 px-6 md:px-12"
        >
          {/* Left Content */}
          <div className="flex-1 text-center md:text-left">
            {/* Fade-in animation for companyName */}
            <motion.h1
              className="text-3xl md:text-4xl font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 5 }}
            >
              {t("companyName")}
            </motion.h1>

            {/* Fade-in animation for businessSolution with delay */}
            <motion.h1
              className="text-3xl md:text-4xl font-semibold mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 7, delay: 0.5 }} // Adds delay for second text
            >
              {t("businessSolution")}
            </motion.h1>

            <div className="mt-6 space-y-3">
              <motion.div
                className="flex items-center justify-center md:justify-start gap-2 text-gray-300 text-sm"
                initial={{ x: -1000 }} // Start position (off-screen to the left)
                animate={{ x: 0 }} // Final position (in its original place)
                transition={{ duration: 1, delay: 1, ease: "easeOut" }} // Duration and easing for smoothness
              >
                <img src={Check} alt="Check" className="w-5 h-5" />
                {t("connectFreelancers")}
              </motion.div>

              <motion.div
                className="flex items-center justify-center md:justify-start gap-2 text-gray-300 text-sm"
                initial={{ x: -1000 }} // Start position (off-screen to the left)
                animate={{ x: 0 }} // Final position (in its original place)
                transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
              >
                <img src={Check} alt="Check" className="w-5 h-5" />
                {t("matchedTalent")}
              </motion.div>
              <motion.div
                className="flex items-center justify-center md:justify-start gap-2 text-gray-300 text-sm"
                initial={{ x: -1000 }} // Start position (off-screen to the left)
                animate={{ x: 0 }} // Final position (in its original place)
                transition={{ duration: 1, delay: 2, ease: "easeOut" }}
              >
                <img src={Check} alt="Check" className="w-5 h-5" />
                {t("manageTeamwork")}
              </motion.div>
            </div>

            <Link to={`/about-us`}>
              <motion.button className="mt-6 bg-[#FF8C00] hover:bg-[#FFA500] text-white py-3  px-8 rounded-lg text-lg transition duration-300 ease-in-out">
                {t("exploreRMGC")}
              </motion.button>
            </Link>
          </div>

          {/* Right Image */}
          <div className="flex-1">
            <motion.img
              src="https://cdni.iconscout.com/illustration/premium/thumb/little-people-moving-at-huge-monitor-with-graphs-illustration-download-in-svg-png-gif-file-formats--business-character-collaboration-colleague-network-communication-illustrations-2264299.png"
              alt="Business Illustration"
              className="w-full max-w-[500px] mx-auto md:mx-0 rounded-lg shadow-lg"
              initial={{ scale: 1 }} // Start with a normal scale
              animate={{ scale: [1, 1.1, 1] }} // Animate continuously, increasing and decreasing scale
              transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0, // No delay between repetitions
                yoyo: Infinity, // Makes the animation flow from the last scale position to the next
              }}
            />
          </div>
        </div>
      </div>

      {/* Slide Section */}
      <Slide />
      {/* <GoogleAd /> */}
    </div>
  );
};

export default Home;
