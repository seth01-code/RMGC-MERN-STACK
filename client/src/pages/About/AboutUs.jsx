import React from "react";
import {
  FaHandshake,
  FaShieldAlt,
  FaUserTie,
  FaComments,
} from "react-icons/fa";
import aboutBg from "../../../assets/images/aboutUs.jpg";
import founderImg from "../../../assets/images/mi.jpg";
import ctoImg from "../../../assets/images/12.jpg";

const AboutUs = () => {
  return (
    <section className="bg-gray-50 text-gray-900">
      {/* Hero Section */}
      <div
        className="relative w-full h-[450px] bg-cover bg-center flex items-center justify-center text-white"
        style={{ backgroundImage: `url(${aboutBg})` }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-wide z-10">
          About Us
        </h1>
      </div>

      {/* About Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-700 mb-6">
              Who We Are
            </h2>
            <p className="text-lg leading-relaxed text-gray-700">
              <strong className="text-orange-700">
                Renewed Minds Global Consult (RMGC)
              </strong>{" "}
              is an Advertising & Consulting Agency founded on{" "}
              <strong>9th November 2021</strong> by{" "}
              <strong>Ms Miracle Ikhielea</strong>, with support from our{" "}
              <strong>CTO & Personal Assistant, Master Seth Ikhielea</strong>.
            </p>
            <p className="text-lg leading-relaxed mt-4 text-orange-700">
              Our mission is to bridge the gap between{" "}
              <strong>skilled service providers</strong> and{" "}
              <strong>clients</strong>, ensuring{" "}
              <strong>quality service delivery</strong> while empowering
              professionals with <strong>better revenue opportunities</strong>.
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-orange-700 italic">
              “Meeting Service Needs and Unlocking Possibilities.”
            </p>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="bg-gray-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12">
            Why Choose Us?
          </h2>
          <div className="grid md:grid-cols-2 gap-12 text-lg leading-relaxed">
            <p>
              We exist for <strong>you</strong>. Our goal is to provide
              satisfaction while unlocking opportunities.
            </p>
            <p>
              As a <strong>service provider</strong>, you get access to global
              clients, increased revenue, and full control over your pricing.
            </p>
            <p>
              As a <strong>client</strong>, our platform ensures you can hire
              professionals seamlessly, with secure transactions and quality
              service.
            </p>
            <p>
              Our platform ensures transparency and compliance with service
              standards, giving you a reliable experience.
            </p>
          </div>
        </div>
      </div>

      {/* Leadership Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-gray-700 text-center mb-12">
          Leadership
        </h2>
        <div className="grid sm:grid-cols-2 gap-12">
          {[
            {
              name: "Miracle Ikhielea",
              role: "Founder & CEO",
              img: founderImg,
            },
            {
              name: "Seth Ikhielea",
              role: "CTO & Personal Assistant",
              img: ctoImg,
            },
          ].map((leader, index) => (
            <div
              key={index}
              className="bg-white shadow-md p-8 rounded-xl flex flex-col items-center text-center hover:shadow-xl transition-transform transform hover:scale-105"
            >
              <img
                src={leader.img}
                alt={leader.name}
                className="w-48 h-48 rounded-full object-cover border-4 border-orange-500"
              />
              <h3 className="text-xl font-semibold mt-4">{leader.name}</h3>
              <p className="text-sm text-gray-600">{leader.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Core Values */}
      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-700 text-center mb-12">
            Our Core Values
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                name: "Transparency",
                icon: <FaHandshake />,
                color: "bg-indigo-700",
              },
              {
                name: "Integrity",
                icon: <FaShieldAlt />,
                color: "bg-green-600",
              },
              {
                name: "Professionalism",
                icon: <FaUserTie />,
                color: "bg-blue-600",
              },
              {
                name: "Communication",
                icon: <FaComments />,
                color: "bg-red-600",
              },
            ].map((value, index) => (
              <div
                key={index}
                className={`${value.color} text-white p-6 rounded-xl flex flex-col items-center shadow-lg hover:shadow-2xl transition-transform transform hover:scale-105`}
              >
                <div className="text-5xl">{value.icon}</div>
                <h3 className="text-lg font-semibold mt-3">{value.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Reach */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-indigo-700 text-center mb-6">
          Our Global Reach
        </h2>
        <p className="text-lg leading-relaxed text-center text-gray-700 max-w-4xl mx-auto">
          <strong>Renewed Minds Global Consult</strong> operates physically in{" "}
          <strong>Nigeria</strong> but leverages <strong>technology</strong> to{" "}
          <strong>extend our services globally</strong>, making an impact across
          borders.
        </p>
      </div>

      {/* Telegram Button */}
      <div className="my-12 flex justify-center">
        <a
          href="https://t.me/YOUR_TELEGRAM_CHANNEL" // Replace with your actual Telegram channel link
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full shadow-md transition-transform transform hover:scale-105 flex items-center space-x-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M21.94 2.82a1.75 1.75 0 00-1.83-.21L2.68 10.2a1.5 1.5 0 00.1 2.8l4.73 1.57 2.18 5.83a1.5 1.5 0 002.7.2l2.63-4.2 4.58 3.26a1.5 1.5 0 002.37-1.14V3.75a1.5 1.5 0 00-.93-1.39z" />
          </svg>
          <span>Join Our Official Telegram</span>
        </a>
      </div>
    </section>
  );
};

export default AboutUs;
