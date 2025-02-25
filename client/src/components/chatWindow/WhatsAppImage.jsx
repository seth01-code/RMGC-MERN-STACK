import React, { useState } from "react";

const WhatsAppImage = ({ message }) => {
  const [isFullView, setIsFullView] = useState(false);

  const imageTypes = ["jpg", "jpeg", "png", "gif", "webp"];
  const fileExtension = message.media.split(".").pop().toLowerCase();

  if (!imageTypes.includes(fileExtension)) return null;

  return (
    <>
      {/* Image Thumbnail */}
      <img
        src={message.media}
        alt="Image"
        className="rounded-lg w-full max-w-xs sm:max-w-sm md:max-w-md cursor-pointer transition-transform hover:scale-105"
        onClick={() => setIsFullView(true)}
      />

      {/* Full View Modal */}
      {isFullView && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setIsFullView(false)}
        >
          <img
            src={message.media}
            alt="Full View"
            className="max-w-full max-h-[90vh] rounded-lg shadow-lg transition-transform scale-100 hover:scale-105"
          />
        </div>
      )}
    </>
  );
};

export default WhatsAppImage;
