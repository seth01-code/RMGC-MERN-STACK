import React, { useState, useEffect } from "react";
import {
  FaDownload,
  FaFile,
  FaFileExcel,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
} from "react-icons/fa";

const DocumentMessage = ({ message, fileExtension, fileName, isSender }) => {
  const localStorageKey = `downloaded_${fileName}`;
  const [downloaded, setDownloaded] = useState(false);

  // Check if the file was downloaded before
  useEffect(() => {
    const isDownloaded = localStorage.getItem(localStorageKey) === "true";
    setDownloaded(isDownloaded);
  }, [localStorageKey]);

  // Function to get the appropriate file preview URL
  const getFilePreviewURL = (fileUrl, fileExtension) => {
    switch (fileExtension) {
      case "doc":
      case "docx":
        return `https://docs.google.com/gview?url=${encodeURIComponent(
          fileUrl
        )}&embedded=true`;
      case "pdf":
        return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(
          fileUrl
        )}`;
      case "xls":
      case "xlsx":
      case "ppt":
      case "pptx":
        return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
          fileUrl
        )}`;
      default:
        return fileUrl; // Open file normally if no viewer is available
    }
  };

  // **Handle Download Click**
  const handleDownload = () => {
    setDownloaded(true);
    localStorage.setItem(localStorageKey, "true"); // Save to local storage
    window.open(message.media, "_blank");
  };

  // **Handle File Click (Open in Viewer)**
  const handleFileOpen = () => {
    const previewURL = getFilePreviewURL(message.media, fileExtension);
    window.open(previewURL, "_blank"); // Open the preview in a new tab
  };

  // Function to get the file icon based on extension
  const getFileIcon = (fileExtension) => {
    switch (fileExtension) {
      case "pdf":
        return <FaFilePdf className="text-red-500 text-3xl sm:text-2xl" />;
      case "doc":
      case "docx":
        return <FaFileWord className="text-blue-700 text-3xl sm:text-2xl" />;
      case "xls":
      case "xlsx":
        return <FaFileExcel className="text-green-500 text-3xl sm:text-2xl" />;
      case "ppt":
      case "pptx":
        return (
          <FaFilePowerpoint className="text-orange-500 text-3xl sm:text-2xl" />
        );
      default:
        return <FaFile className="text-gray-500 text-3xl sm:text-2xl" />;
    }
  };

  return (
    <div
      className={`flex items-center w-52 gap-3 sm:gap-2 p-4 rounded-xl 
      ${isSender ? "bg-blue-500 text-white" : "bg-gray-600"} 
      flex-wrap sm:flex-nowrap w-full max-w-md sm:max-w-lg`}
    >
      {/* File Icon */}
      <div className="flex-shrink-0">{getFileIcon(fileExtension)}</div>

      {/* File Details */}
      <div className="flex-1 min-w-0">
        <span
          className="block truncate text-blue-700 cursor-pointer hover:underline"
          onClick={handleFileOpen}
          title={fileName} // Show full name on hover
        >
          {fileName}
        </span>
      </div>

      {/* Download button only visible if the file is not downloaded yet */}
      {!isSender && !downloaded && (
        <a
          href={message.media}
          download={fileName}
          onClick={handleDownload}
          className="text-blue-700 flex-shrink-0 p-2 sm:p-1 hover:text-blue-900 transition"
        >
          <FaDownload className="text-2xl sm:text-xl" />
        </a>
      )}
    </div>
  );
};

export default DocumentMessage;
