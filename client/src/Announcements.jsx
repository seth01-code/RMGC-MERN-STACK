import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const Announcements = () => {
  const [currentAnnouncement, setCurrentAnnouncement] = useState(0);

  const announcements = [
    {
      text: "💰 All transactions on this platform are securely processed and safe! 💰",
    },
    {
      text: "📩 Kindly check your messages regularly for important updates and new conversations. Stay connected! 📩",
    },
    {
      text: "🚀 File uploads on RMGC have specific limits: 10MB max image size, 100MB max video size, 10MB max documents/audio file size. Ensure your files meet these limits before uploading! 🚀",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAnnouncement((prev) => (prev + 1) % announcements.length);
    }, 60000); // Change announcement every 60 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-black to-gray-800 sticky top-0 z-50 text-white text-center py-4 text-sm font-medium flex justify-center items-center overflow-hidden">
      <motion.div
        className="whitespace-nowrap"
        key={currentAnnouncement} // Forces re-render on change
        initial={{ x: "100%" }}
        animate={{ x: "-100%" }}
        transition={{
          repeat: Infinity,
          duration: 40,
          ease: "linear",
        }}
      >
        {announcements[currentAnnouncement].text}
      </motion.div>
    </div>
  );
};

export default Announcements;
