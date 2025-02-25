import React from "react";
import Lottie from "lottie-react";
import preloaderAnimation from "../../../assets/images/loader.json"; // Your Lottie JSON file
import "./Preloader.css";

const Preloader = () => {
  return (
    <div className="preloader">
      <Lottie animationData={preloaderAnimation} loop={true} className="lottie-animation" />
    </div>
  );
};

export default Preloader;
