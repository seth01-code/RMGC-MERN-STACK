import React, { useRef, useState, useEffect } from "react";
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaTimes,
} from "react-icons/fa";

let currentlyPlayingVideo = null; // Track the playing video globally

const CustomVideoPlayer = ({ src, fileExtension }) => {
  const smallVideoRef = useRef(null);
  const fullVideoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullView, setIsFullView] = useState(false);

  // Toggle play/pause
  const togglePlay = (videoRef, setPlayingState) => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (currentlyPlayingVideo && currentlyPlayingVideo !== video) {
        currentlyPlayingVideo.pause();
      }
      currentlyPlayingVideo = video;
      video.play();
      setPlayingState(true);
    } else {
      video.pause();
      setPlayingState(false);
    }
  };

  // Handle video progress
  const handleProgress = (videoRef, setProgressState) => {
    const video = videoRef.current;
    if (video) {
      const percentage = (video.currentTime / video.duration) * 100;
      setProgressState(percentage);
    }
  };

  // Seek video
  const handleSeek = (e, videoRef, setProgressState) => {
    const video = videoRef.current;
    if (video) {
      const newTime = (e.target.value / 100) * video.duration;
      video.currentTime = newTime;
      setProgressState(e.target.value);
    }
  };

  // Open full-screen view
  const handleFullScreen = () => {
    setIsFullView(true);
    if (smallVideoRef.current) {
      smallVideoRef.current.pause(); // Stop small video when opening full-screen
      setIsPlaying(false);
    }
  };

  // Close full-screen view
  const closeFullScreen = () => {
    setIsFullView(false);
    if (fullVideoRef.current) {
      fullVideoRef.current.pause(); // Stop full-screen video when closing
    }
  };

  useEffect(() => {
    const smallVideo = smallVideoRef.current;
    if (!smallVideo) return;

    const handlePause = () => {
      if (currentlyPlayingVideo === smallVideo) {
        currentlyPlayingVideo = null;
        setIsPlaying(false);
      }
    };

    smallVideo.addEventListener("pause", handlePause);
    return () => smallVideo.removeEventListener("pause", handlePause);
  }, []);

  return (
    <>
      {/* Small Video Container */}
      <div className="relative w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl group">
        {/* Small Video */}
        <video
          ref={smallVideoRef}
          className="rounded-lg w-full border border-gray-600 cursor-pointer object-cover"
          onTimeUpdate={() => handleProgress(smallVideoRef, setProgress)}
        >
          <source src={src} type={`video/${fileExtension}`} />
        </video>

        {/* Play/Pause Button (visible on hover or always on mobile) */}
        {!isPlaying && (
          <button
            onClick={() => togglePlay(smallVideoRef, setIsPlaying)}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg transition-opacity duration-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <FaPlay className="text-white text-4xl" />
          </button>
        )}

        {/* Full-Screen Button */}
        <button
          onClick={handleFullScreen}
          className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-60 p-3 rounded-full hover:bg-opacity-80 transition transform active:scale-90"
        >
          <FaExpand className="text-white text-lg" />
        </button>
      </div>

      {/* Full-Screen Video Modal */}
      {isFullView && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          {/* Close Button */}
          <button
            onClick={closeFullScreen}
            className="absolute top-4 right-4 bg-gray-700 text-white p-3 rounded-full hover:bg-gray-600 transition transform active:scale-90"
          >
            <FaTimes className="text-2xl" />
          </button>

          {/* Full-Screen Video */}
          <video
            ref={fullVideoRef}
            className="w-full h-auto max-w-6xl max-h-[90vh] rounded-lg"
            controls
            autoPlay
            onTimeUpdate={() => handleProgress(fullVideoRef, setProgress)}
          >
            <source src={src} type={`video/${fileExtension}`} />
          </video>
        </div>
      )}
    </>
  );
};

export default CustomVideoPlayer;
