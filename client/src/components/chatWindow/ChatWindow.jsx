import React, { useEffect, useState, useRef } from "react";
import newRequest from "../../utils/newRequest";
import { io } from "socket.io-client";
import {
  FaPaperclip,
  FaPaperPlane,
  FaSmile,
  FaMicrophone,
  FaStop,
  FaBars,
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import upload from "../../utils/upload"; // Import the upload utility
import WhatsAppAudioPlayer from "./WhatsAppAudioPlayer.jsx";
import CustomVideoPlayer from "./CustomVideoPlayer";
import DocumentMessage from "./DocumentMessage.jsx";
import WhatsAppImage from "./WhatsAppImage.jsx";
import { toast } from "react-toastify";

const ChatWindow = ({ userId, conversation, toggleSidebar, isSidebarOpen }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false); // New loading state for file uploads
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const socket = useRef(null);
  const chatEndRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordingInterval = useRef(null);

  useEffect(() => {
    socket.current = io("https://rmgc-mern-stack-6.onrender.com");
    socket.current.emit("join", userId);

    socket.current.on("onlineStatus", ({ userId: onlineUserId, status }) => {
      if (conversation.otherParticipant._id === onlineUserId) {
        setIsOnline(status === "online");
      }
    });

    socket.current.on("updateOnlineUsers", (onlineUserIds) => {
      if (conversation.otherParticipant) {
        setIsOnline(onlineUserIds.includes(conversation.otherParticipant._id));
      }
    });

    const fetchMessages = async () => {
      try {
        const { data } = await newRequest.get(`/messages/${conversation._id}`);
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    return () => {
      socket.current.disconnect();
    };
  }, [conversation, userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!text.trim() && !file && !audioBlob) {
      toast.error("❌ Cannot send an empty message.");
      return;
    }

    let fileUrl = "";
    let audioUrlForMessage = "";

    // Handle file upload
    if (file) {
      try {
        setLoadingFile(true);
        setUploadProgress(0);

        const uploadedFile = await upload(file, (progress) => {
          setUploadProgress(progress); // Update upload progress
        });

        fileUrl = uploadedFile?.secure_url || uploadedFile?.url;
        setLoadingFile(false);

        if (!fileUrl) {
          toast.error("❌ File upload failed. Please try again.");
          return;
        }
      } catch (err) {
        console.error("Error uploading file:", err);
        setLoadingFile(false);
        toast.error("❌ File upload failed. Please try again.");
        return;
      }
    }

    // Handle audio upload
    if (audioBlob) {
      try {
        setLoadingFile(true);
        setUploadProgress(0);

        const uniqueFileName = `audio_${Date.now()}.wav`;
        const audioFile = new File([audioBlob], uniqueFileName, {
          type: "audio/wav",
        });

        const uploadedAudio = await upload(audioFile, (progress) => {
          setUploadProgress(progress);
        });

        audioUrlForMessage = uploadedAudio?.secure_url || uploadedAudio?.url;
        setLoadingFile(false);

        if (!audioUrlForMessage) {
          toast.error("❌ Audio upload failed. Please try again.");
          return;
        }
      } catch (err) {
        console.error("Error uploading audio:", err);
        setLoadingFile(false);
        toast.error("❌ Audio upload failed. Please try again.");
        return;
      }
    }

    if (!text.trim() && !fileUrl && !audioUrlForMessage) {
      toast.error("❌ Cannot send an empty message.");
      return;
    }

    const formData = new FormData();
    formData.append("senderId", userId);
    formData.append("conversationId", conversation._id);
    if (text) formData.append("text", text);
    if (fileUrl) formData.append("media", fileUrl);
    if (audioUrlForMessage) formData.append("media", audioUrlForMessage);

    try {
      const { data } = await newRequest.post("/messages/send", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const formattedMessage = { ...data, senderId: { _id: userId } };
      socket.current.emit("sendMessage", formattedMessage);
      setMessages((prev) => [...prev, formattedMessage]);

      setText("");
      setFile(null);
      setAudioBlob(null);
      setUploadProgress(0); // Reset progress after successful upload
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("❌ Failed to send message. Please try again.");
    }
  };

  const handleEmojiClick = () => {
    setShowEmojiPicker(false);
  };

  const startRecording = () => {
    setIsRecording(true);
    audioChunks.current = [];
    setRecordingDuration(0); // Reset the duration on start

    const stream = navigator.mediaDevices.getUserMedia({ audio: true });
    stream.then((mediaStream) => {
      mediaRecorder.current = new MediaRecorder(mediaStream);
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        setIsRecording(false);
      };
      mediaRecorder.current.start();

      recordingInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    });
  };

  const stopRecording = () => {
    clearInterval(recordingInterval.current); // Stop recording duration interval
    mediaRecorder.current.stop();
    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
      setAudioBlob(audioBlob);
      setAudioUrl(URL.createObjectURL(audioBlob));
      sendVoiceNote(audioBlob); // Send voice note immediately after recording stops
      setIsRecording(false);
    };
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const sendVoiceNote = async (blob) => {
    try {
      setLoadingFile(true);
      const uniqueFileName = `voice_note_${Date.now()}.wav`;
      const audioFile = new File([blob], uniqueFileName, { type: "audio/wav" });

      const uploadedAudio = await upload(audioFile); // Upload audio to Cloudinary
      const audioUrlForMessage =
        uploadedAudio?.secure_url || uploadedAudio?.url; // Ensure secure URL
      setLoadingFile(false);

      const formData = new FormData();
      formData.append("senderId", userId);
      formData.append("conversationId", conversation._id);
      formData.append("media", audioUrlForMessage);

      const { data } = await newRequest.post("/messages/send", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const formattedMessage = { ...data, senderId: { _id: userId } };

      socket.current.emit("sendMessage", formattedMessage);
      setMessages((prev) => [...prev, formattedMessage]);

      setAudioBlob(null); // Reset audio blob after sending
    } catch (err) {
      console.error("Error uploading voice note:", err);
      setLoadingFile(false);
    }
  };

  const renderMediaPreview = (message) => {
    if (!message.media) return null;

    const fileExtension = message.media.split(".").pop().toLowerCase();
    const isSender = message.senderId._id === userId;
    const fileName = message.display_name || message.media.split("/").pop(); // Use display_name if available, otherwise fallback to URL
    // Use actual file name from DB"""

    const imageTypes = ["jpg", "jpeg", "png", "gif", "webp"];
    const videoTypes = ["mp4", "webm", "mov"];
    const audioTypes = ["mp3", "wav", "ogg", "m4a"];
    const documentTypes = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];

    if (imageTypes.includes(fileExtension)) {
      return <WhatsAppImage message={message} />;
    }

    if (videoTypes.includes(fileExtension)) {
      return (
        <CustomVideoPlayer src={message.media} fileExtension={fileExtension} />
      );
    }

    if (audioTypes.includes(fileExtension)) {
      return (
        <WhatsAppAudioPlayer
          src={message.media}
          fileExtension={fileExtension}
          isSender={isSender}
        />
      );
    }
    if (documentTypes.includes(fileExtension)) {
      return (
        <DocumentMessage
          message={message}
          fileExtension={fileExtension}
          fileName={fileName}
          isSender={isSender}
        />
      );
    }

    return null;
  };

  return (
    <div
      className={`flex flex-col bg-gray-900 text-white transition-all ${
        isSidebarOpen ? "w-[70%] md:w-[60%] lg:w-[100%]" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <button
          onClick={toggleSidebar}
          className="sm:hidden text-white text-xl p-2"
        >
          <FaBars />
        </button>
        {conversation ? (
          <div className="flex items-center gap-3">
            {conversation.otherParticipant?.img && (
              <img
                src={conversation.otherParticipant.img}
                alt={conversation.otherParticipant.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold">
                {conversation.otherParticipant?.username || "Chat"}
              </h2>

              <p className="text-xs text-green-500">
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        ) : (
          <h2 className="text-lg font-semibold">Select a chat</h2>
        )}
      </div>

      {/* Chat Messages */}
      <div
        className={`${isSidebarOpen ? "hidden" : "flex-1 p-4 overflow-y-auto"}`}
      >
        {messages.map((msg, idx) => {
          const isSender = msg.senderId._id === userId;
          return (
            <div
              key={idx}
              className={`flex ${isSender ? "justify-end" : "justify-start"}`}
            >
              <div className="p-3 rounded-lg max-w-[75%] sm:max-w-[65%] lg:max-w-[50%]">
                {msg.media && renderMediaPreview(msg)}
                {msg.text && (
                  <p
                    className={`p-2 rounded-lg break-words ${
                      isSender ? "bg-green-600" : "bg-gray-700"
                    }`}
                  >
                    {msg.text}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      {loadingFile && (
        <div className="p-2 w-full max-w-lg mx-auto flex flex-col items-center gap-2 bg-gray-800 rounded-lg shadow-md">
          {/* File Name (Truncated if too long) */}
          <div className="text-white text-xs sm:text-sm font-medium flex items-center gap-2 w-full truncate">
            <FaPaperclip className="text-blue-400" />
            <span className="truncate max-w-[80%]">{file?.name}</span>
          </div>

          {/* Progress Percentage */}
          <span className="text-white text-xs sm:text-sm font-medium">
            {uploadProgress}%
          </span>

          {/* Progress Bar */}
          <div className="w-full h-2 sm:h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-300 transition-all ease-in-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="flex sticky items-center gap-2 p-4 bg-gray-800 border-t border-gray-700">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-xl p-2 rounded-full hover:bg-gray-700"
        >
          <FaSmile />
        </button>

        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-20">
            <EmojiPicker
              onEmojiClick={(emoji) => setText((prev) => prev + emoji.emoji)}
            />
          </div>
        )}

        <div className={`${isSidebarOpen ? "hidden" : "relative flex-1"}`}>
          <div className="relative w-full">
            <div className="relative w-full flex items-center justify-center">
              {isRecording && (
                <div className="absolute text-red-500 text-sm">
                  Recording... {formatTime(recordingDuration)}
                </div>
              )}
              <textarea
                className="w-full p-2 rounded-md bg-gray-700 text-white resize-none h-10 max-h-32 overflow-auto scrollbar-hidden custom-scrollbar focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={isRecording ? "" : "Type a message..."}
                value={isRecording ? "" : text}
                onChange={(e) => setText(e.target.value)}
                disabled={isRecording} // Disable typing when recording
              />
            </div>
          </div>

          {file && (
            <div className="mt-2 flex items-center bg-gray-800 p-2 rounded-lg text-sm text-white overflow-hidden truncate max-w-full">
              <FaPaperclip className="mr-2 text-blue-400" />
              <span className="truncate max-w-[200px]">{file.name}</span>
              <button
                onClick={() => setFile(null)}
                className="ml-2 text-red-400 hover:text-red-600"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        <label htmlFor="file-upload" className="cursor-pointer">
          <FaPaperclip className="text-xl text-gray-400 hover:text-gray-200" />
        </label>

        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          onClick={handleSendMessage}
          className="text-white bg-blue-600 p-2 rounded-full"
        >
          <FaPaperPlane />
        </button>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`text-xl ${isRecording ? "animate-pulse" : ""}`}
        >
          {isRecording ? (
            <FaStop className="text-red-600 rounded-full hover:text-red-400" />
          ) : (
            <FaMicrophone className="text-blue-600 rounded-full hover:text-blue-400" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
