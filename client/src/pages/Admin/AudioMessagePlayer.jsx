import React, { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { FaDownload, FaPause, FaPlay } from "react-icons/fa";

let currentlyPlayingAudio = null;

const AudioMessagePlayer = ({ src, fileExtension, fileName, isSender }) => {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState(fileExtension === "wav" ? "" : "0:00");
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloaded, setDownloaded] = useState(() => localStorage.getItem(`downloaded-${fileName}`) === "true");

  const audioRef = useRef(null);
  const waveformRef = useRef(null);
  const waveSurferRef = useRef(null);

  useEffect(() => {
    if (fileExtension === "wav") {
      waveSurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#9CA3AF",
        progressColor: "#22C55E",
        cursorColor: "#FFFFFF",
        barWidth: 2,
        responsive: true,
        height: 45,
      });

      waveSurferRef.current.load(src);
      waveSurferRef.current.on("ready", () => setDuration(formatTime(waveSurferRef.current.getDuration())));
      waveSurferRef.current.on("audioprocess", () => setCurrentTime(formatTime(waveSurferRef.current.getCurrentTime())));
      waveSurferRef.current.on("finish", () => setIsPlaying(false));

      return () => {
        if (waveSurferRef.current) {
          waveSurferRef.current.destroy();
          waveSurferRef.current = null;
        }
      };
    }
  }, [fileExtension, src]);

  useEffect(() => {
    if (fileExtension === "wav") return;
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(formatTime(audio.currentTime));
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration)) setDuration(formatTime(audio.duration));
    };

    const handlePlay = () => {
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
        currentlyPlayingAudio.pause();
      }
      currentlyPlayingAudio = audio;
      setIsPlaying(true);
    };

    const handlePause = () => {
      if (currentlyPlayingAudio === audio) currentlyPlayingAudio = null;
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [fileExtension]);

  const formatTime = (time) => {
    if (isNaN(time) || time < 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const togglePlay = () => {
    if (fileExtension === "wav") {
      isPlaying ? waveSurferRef.current.pause() : waveSurferRef.current.play();
      setIsPlaying(!isPlaying);
      return;
    }
    const audio = audioRef.current;
    if (audio) isPlaying ? audio.pause() : audio.play();
  };

  const handleDownload = () => {
    setDownloaded(true);
    localStorage.setItem(`downloaded-${fileName}`, "true");
  };

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-lg w-full min-w-52 max-w-sm md:max-w-md ${isSender ? "bg-green-600" : "bg-gray-800"}`}>
      {fileExtension !== "wav" && <audio ref={audioRef} src={src} type={`audio/${fileExtension}`} className="hidden" />}
      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className="text-white p-2 rounded-full bg-green-500 md:p-3">
          {isPlaying ? <FaPause className="text-lg md:text-xl" /> : <FaPlay className="text-lg md:text-xl" />}
        </button>
        <span className="text-white text-sm md:text-base">{currentTime}</span>
        {fileExtension === "wav" ? <div ref={waveformRef} className="flex-1"></div> : (
          <div className="relative flex-1 h-1 bg-gray-600 rounded-full overflow-hidden cursor-pointer">
            <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        {fileExtension !== "wav" && <span className="text-white text-sm md:text-base">{duration}</span>}
      </div>
    </div>
  );
};

export default AudioMessagePlayer;
