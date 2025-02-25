import React, { useState } from "react";
import ChatSidebar from "../../components/ChatSideBar/ChatSidebar";
import ChatWindow from "../../components/chatWindow/ChatWindow";

const ChatPage = ({ userId }) => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar state

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar should be hidden on small screens and visible on large screens */}
      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? "w-full md:w-[20%] lg:w-[30%]" : "w-0"
        } md:min-w-[25%] lg:min-w-[33%]`}
      >
        <ChatSidebar
          userId={userId}
          selectConversation={setSelectedConversation}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      </div>

      {/* Chat window (conditionally rendered) */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatWindow
            userId={userId}
            conversation={selectedConversation}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
