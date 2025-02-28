import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import { useNavigate } from "react-router-dom";
import {
  FaChevronRight,
  FaMicrophone,
  FaFileAlt,
  FaCamera,
  FaVideo,
  FaPaperclip,
} from "react-icons/fa";

const AdminMessages = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const navigate = useNavigate();

  // Fetch all conversations (Admin Route)
  const {
    data: conversations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => newRequest.get("/conversations").then((res) => res.data),
  });

  if (isLoading) return <p>Loading conversations...</p>;
  if (error)
    return (
      <p className="text-red-500">
        Error fetching conversations: {error.message}
      </p>
    );

  // Function to determine message type and assign icon + label
  const getLastMessageDisplay = (message) => {
    if (!message) return "No messages yet";

    const { mediaType, text } = message;

    const mediaIcons = {
      audio: (
        <>
          <FaMicrophone className="inline text-blue-500" /> Voice
        </>
      ),
      document: (
        <>
          <FaFileAlt className="inline text-green-500" /> Document
        </>
      ),
      image: (
        <>
          <FaCamera className="inline text-purple-500" /> Photo
        </>
      ),
      video: (
        <>
          <FaVideo className="inline text-red-500" /> Video
        </>
      ),
      file: (
        <>
          <FaPaperclip className="inline text-gray-500" /> File
        </>
      ),
    };

    return mediaIcons[mediaType] || text || "No messages yet";
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Client & Service Provider Conversations
      </h1>

      <div className="w-full max-w-5xl bg-white shadow-lg rounded-lg overflow-hidden p-4">
        {conversations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conversations.map((conversation) => {
              const client = conversation.participants[0];
              const provider = conversation.participants[1];
              const lastMessage = getLastMessageDisplay(
                conversation.lastMessage
              );

              return (
                <div
                  key={conversation._id}
                  onClick={() => {
                    setSelectedConversation(conversation._id);
                    navigate(`/admin/messages/${conversation._id}`);
                  }}
                  className="flex flex-col bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition duration-200 shadow-sm"
                >
                  {/* Client & Provider Info */}
                  <div className="flex items-center justify-between">
                    {/* Client Section */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={client.img || "/default-avatar.png"}
                        alt={client.username}
                        className="w-12 h-12 object-cover rounded-full border border-gray-300 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {client.username}
                        </p>
                        <p className="text-sm text-gray-500">Client</p>
                      </div>
                    </div>

                    {/* Service Provider Section */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={provider.img || "/default-avatar.png"}
                        alt={provider.username}
                        className="w-12 h-12 object-cover rounded-full border border-gray-300 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {provider.username}
                        </p>
                        <p className="text-sm text-gray-500">
                          Service Provider
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Last Message & Arrow */}
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-gray-600 truncate max-w-[200px] md:max-w-full">
                      {lastMessage}
                    </p>
                    <FaChevronRight className="text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-6 text-center text-gray-500">No conversations yet.</p>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;
