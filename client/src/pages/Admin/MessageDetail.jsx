import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import {
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileAlt,
} from "react-icons/fa";

import AudioMessagePlayer from "./AudioMessagePlayer";
import ChatImage from "./ChatImage";
import CustomVideoPlayer from "../../components/chatWindow/CustomVideoPlayer";

const MessageDetail = () => {
  const { id } = useParams();

  const {
    data: conversationData,
    isLoading: convoLoading,
    error: convoError,
  } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () =>
      newRequest.get(`/conversations/single/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  const {
    data: messages,
    isLoading: messagesLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => newRequest.get(`/messages/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  if (convoLoading || messagesLoading)
    return <p className="text-center text-gray-600">Loading messages...</p>;
  if (convoError || messagesError)
    return <p className="text-center text-red-500">Failed to load messages.</p>;
  if (!messages || messages.length === 0)
    return <p className="text-center text-gray-500">No messages found.</p>;

  const sender = conversationData?.participants?.[0];
  const receiver = conversationData?.participants?.[1];

  const getFileIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();

    const icons = {
      pdf: <FaFilePdf className="text-red-700 text-xl" />,
      doc: <FaFileWord className="text-blue-900 text-xl" />,
      docx: <FaFileWord className="text-blue-900 text-xl" />,
      xls: <FaFileExcel className="text-green-600 text-xl" />,
      xlsx: <FaFileExcel className="text-green-600 text-xl" />,
      ppt: <FaFilePowerpoint className="text-orange-600 text-xl" />,
      pptx: <FaFilePowerpoint className="text-orange-600 text-xl" />,
      txt: <FaFileAlt className="text-gray-500 text-xl" />,
    };

    return icons[extension] || <FaFileAlt className="text-gray-500 text-xl" />;
  };

  const getFileName = (url) => {
    return url.split("/").pop();
  };

  // const getMediaType = (url) => {
  //   const extension = url.split(".").pop().toLowerCase();

  //   const mimeTypes = {
  //     // Image formats
  //     jpg: "image/jpeg",
  //     jpeg: "image/jpeg",
  //     png: "image/png",
  //     gif: "image/gif",
  //     svg: "image/svg+xml",
  //     webp: "image/webp",

  //     // Video formats
  //     mp4: "video/mp4",
  //     webm: "video/webm",
  //     ogg: "video/ogg",
  //     mov: "video/quicktime",
  //     avi: "video/x-msvideo",

  //     // Audio formats
  //     mp3: "audio/mpeg",
  //     wav: "audio/wav",
  //     flac: "audio/flac",
  //     aac: "audio/aac",

  //     // Document formats
  //     pdf: "application/pdf",
  //     doc: "application/msword",
  //     docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  //     txt: "text/plain",
  //     csv: "text/csv",
  //     ppt: "application/vnd.ms-powerpoint",
  //     pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  //     xls: "application/vnd.ms-excel",
  //     xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //   };

  //   return mimeTypes[extension] || "application/octet-stream"; // Default type if unknown
  // };

  return (
    <div className="p-4 sm:p-6 mx-auto bg-white rounded-lg shadow-lg h-[85vh] flex flex-col w-full max-w-3xl">
  {/* Header Section */}
  <h1 className="text-2xl font-semibold text-gray-900 border-b pb-3 text-center">
    Conversation
  </h1>

  {/* User Info Bar */}
  <div className="flex flex-wrap items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm gap-4">
    {/* Receiver */}
    <div className="flex items-center gap-3">
      <img
        src={receiver?.img || "/default-avatar.png"}
        alt="Receiver"
        className="w-12 h-12 rounded-full object-cover border border-gray-300 shadow-sm"
      />
      <div>
        <p className="text-xs text-gray-500">Service Provider</p>
        <p className="font-semibold text-gray-800">{receiver?.username}</p>
      </div>
    </div>

    {/* Sender */}
    <div className="flex items-center gap-3">
      <img
        src={sender?.img || "/default-avatar.png"}
        alt="Sender"
        className="w-12 h-12 rounded-full object-cover border border-gray-300 shadow-sm"
      />
      <div>
        <p className="text-xs text-blue-500">Client</p>
        <p className="font-semibold text-gray-800">{sender?.username}</p>
      </div>
    </div>
  </div>

  {/* Chat Messages Section */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {messages.length > 0 ? (
      messages.map((msg) => {
        const isSender = msg.senderId._id === sender._id;

        return (
          <div
            key={msg._id}
            className={`flex items-end gap-3 ${
              isSender ? "justify-end" : "justify-start"
            }`}
          >
            {/* Show receiver avatar */}
            {!isSender && (
              <img
                src={receiver?.img || "/default-avatar.png"}
                alt="User"
                className="w-8 h-8 rounded-full object-cover"
              />
            )}

            {/* Message Content */}
            <div className="flex flex-col max-w-[80%] sm:max-w-[70%] lg:max-w-[60%] space-y-2">
              {/* Text Message */}
              {msg.text && (
                <div
                  className={`p-3 text-sm shadow-md rounded-lg ${
                    isSender
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-900 rounded-bl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              )}
              {/* Image Message */}
              {msg.media &&
                msg.media.match(
                  /\.(jpeg|jpg|png|gif|webp|svg|bmp|tiff|tif|ico|heic|heif|avif)$/
                ) && <ChatImage message={msg} />}
              {/* Video Message */}
              {msg.media &&
                msg.media.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/) && (
                  <CustomVideoPlayer
                    src={msg.media}
                    fileExtension={msg.media.split(".").pop()}
                  />
                )}
              {/* Audio Message */}
              {msg.media &&
                msg.media.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/) && (
                  <AudioMessagePlayer
                    src={msg.media}
                    fileExtension={msg.media.split(".").pop()}
                    isSender={isSender}
                  />
                )}
              {/* Document Message */}
              {msg.media &&
                msg.media.match(
                  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|rtf|odt|mp3|wav|ogg|flac|aac|m4a|mp4|webm|ogg|mov|avi|mkv|flv|wmv|jpeg|jpg|png|gif|webp|svg|bmp|tiff|tif|ico|heic|heif|avif)$/
                ) && (
                  <div
                    className={`p-3 text-sm shadow-md flex items-center gap-2 rounded-lg ${
                      isSender ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    {getFileIcon(msg.media)}
                    <a
                      href={msg.media}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline truncate"
                    >
                      {getFileName(msg.media)}
                    </a>
                  </div>
                )}
              {/* Timestamp */}
              <p
                className={`text-xs text-gray-400 mt-1 ${
                  isSender ? "text-right" : "text-left"
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString()}
              </p>
            </div>

            {/* Show sender avatar */}
            {isSender && (
              <img
                src={sender?.img || "/default-avatar.png"}
                alt="User"
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
          </div>
        );
      })
    ) : (
      <p className="text-gray-500 text-center mt-6">No messages yet.</p>
    )}
  </div>
</div>

  );
};

export default MessageDetail;
