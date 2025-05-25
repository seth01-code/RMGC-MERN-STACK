import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import newRequest from "../../utils/newRequest";
import { useQuery } from "@tanstack/react-query";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { useTranslation } from "react-i18next";
import Reviews from "../../components/reviews/Reviews";
import moment from "moment";
import { FaCheckDouble } from "react-icons/fa6";
import { IoMdStar } from "react-icons/io";
import { MdMessage } from "react-icons/md";
import Recycle from "../../../assets/images/recycle.png";
import Clock from "../../../assets/images/clock.png";

const Gig = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const { isLoading, error, data } = useQuery({
    queryKey: ["gig", id],
    queryFn: () => newRequest.get(`/gigs/single/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  const {
    isLoading: isLoadingUser,
    error: errorUser,
    data: dataUser,
  } = useQuery({
    queryKey: ["user", data?.userId],
    queryFn: () => {
      if (!data?.userId) return;
      return newRequest.get(`/users/${data.userId}`).then((res) => res.data);
    },
    enabled: !!data?.userId,
  });

  const { data: userData } = useQuery({
    queryKey: ["authenticatedUser"],
    queryFn: () => newRequest.get("/users/me").then((res) => res.data),
  });

  const { exchangeRate, currencySymbol } = useExchangeRate(
    userData?.country || "United States"
  );

  // Replicating the handleContact function from Orders.jsx
  const handleContact = async () => {
    if (!currentUser?.id) {
      console.error("Current user ID is missing!");
      return;
    }

    if (!data?.userId) {
      console.error("Gig owner (seller) ID is missing!");
      return;
    }

    const sellerId = data.userId; // Get seller ID from gig
    const otherUserId = currentUser.isSeller ? null : sellerId; // Prevent sellers from contacting themselves

    if (!otherUserId) {
      console.error("Cannot contact yourself!");
      return;
    }

    try {
      await newRequest.post(`/conversations/`, {
        userId: currentUser.id,
        otherUserId,
      });

      // Navigate to chat after conversation is created
      navigate(`/chat`);
    } catch (error) {
      console.error("Error handling contact:", error);
    }
  };

  const date = moment(dataUser?.createdAt).format("DD MMMM, YYYY");

  return (
    <div className="p-4 md:p-8 lg:p-12">
      {isLoading ? (
        <p className="text-center text-lg">{t("loading")}</p>
      ) : error ? (
        <p className="text-center text-red-500">{t("errorMessage")}</p>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <span className="text-sm text-gray-500">
                <Link to="/" className="text-blue-500 hover:underline">
                  {t("siteName")}
                </Link>{" "}
                &rarr; {data.cat} Category
              </span>
            </div>

            <h1 className="text-2xl font-bold mb-4">{data.title}</h1>

            {isLoadingUser ? (
              <p>{t("loading")}</p>
            ) : errorUser ? (
              <p className="text-red-500">{t("errorMessage")}</p>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                <img
                  className="object-cover w-12 h-12 rounded-full"
                  src={
                    dataUser?.img ||
                    "https://miamistonesource.com/wp-content/uploads/2018/05/no-avatar-25359d55aa3c93ab3466622fd2ce712d1.jpg"
                  }
                  alt="Profile"
                />
                <span className="font-medium">{dataUser?.username}</span>
                {!isNaN(data.totalStars / data.starNumber) && (
                  <div className="flex items-center gap-1">
                    {Array(Math.round(data.totalStars / data.starNumber))
                      .fill()
                      .map((_, i) => (
                        <IoMdStar key={i} className="text-[#FF8C00] text-sm" />
                      ))}
                    <span className="text-sm">
                      {Math.round(data.totalStars / data.starNumber)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {data && (
              <>
                {data.images?.length > 0 ||
                data.videos?.length > 0 ||
                data.documents?.length > 0 ? (
                  <Swiper
                    spaceBetween={10}
                    slidesPerView={1}
                    autoplay={{ delay: 2500, disableOnInteraction: false }}
                    modules={[Autoplay]}
                    className="bg-[#F5F5F5] rounded-lg overflow-hidden"
                  >
                    {[
                      ...(data.images || []),
                      ...(data.videos || []),
                      ...(data.documents || []),
                    ].map((fileUrl, index) => {
                      const isImage = /\.(jpeg|jpg|png|gif|webp)$/i.test(
                        fileUrl
                      );
                      const isVideo = /\.(mp4|webm|ogg)$/i.test(fileUrl);
                      const isPDF = /\.pdf$/i.test(fileUrl);

                      return (
                        <SwiperSlide
                          key={index}
                          className="bg-[#F5F5F5] flex justify-center items-center"
                        >
                          {isImage ? (
                            <img
                              src={fileUrl}
                              alt={`Slide ${index}`}
                              className="w-full max-h-[500px] object-contain"
                            />
                          ) : isVideo ? (
                            <video
                              className="w-full max-h-[500px] object-contain"
                              src={fileUrl}
                            />
                          ) : isPDF ? (
                            <iframe
                              src={fileUrl}
                              title={`PDF Slide ${index}`}
                              className="w-full h-[500px]"
                            />
                          ) : (
                            <p className="text-center text-gray-500">
                              Unsupported file format
                            </p>
                          )}
                        </SwiperSlide>
                      );
                    })}
                  </Swiper>
                ) : (
                  <p className="text-gray-500">{t("noSamplesMessage")}</p>
                )}
              </>
            )}

            <h2 className="text-xl font-semibold mt-6">{t("aboutGig")}</h2>
            <p className="text-gray-600">{data.desc}</p>

            {/* About Seller Section */}
            {isLoadingUser ? (
              <p>{t("loading")}</p>
            ) : errorUser ? (
              <p className="text-red-500">{t("errorMessage")}</p>
            ) : (
              <div className="mt-8 border p-4 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold">{t("aboutSeller")}</h2>
                <div className="flex items-center gap-4 mt-4">
                  <img
                    src={
                      dataUser?.img ||
                      "https://miamistonesource.com/wp-content/uploads/2018/05/no-avatar-25359d55aa3c93ab3466622fd2ce712d1.jpg"
                    }
                    alt="Seller"
                    className="object-cover w-16 h-16 rounded-full"
                  />
                  <div>
                    <span className="block font-medium">
                      {dataUser?.username}
                    </span>
                    {!isNaN(data.totalStars / data.starNumber) && (
                      <div className="flex items-center gap-1">
                        {Array(Math.round(data.totalStars / data.starNumber))
                          .fill()
                          .map((_, i) => (
                            <IoMdStar
                              key={i}
                              className="text-[#FF8C00] text-sm"
                            />
                          ))}
                        <span className="text-sm">
                          {Math.round(data.totalStars / data.starNumber)}
                        </span>
                      </div>
                    )}
                    <button
                      key="contact-button"
                      className="flex items-center gap-2 text-blue-500 hover:text-blue-700 focus:outline-none px-4 py-2 rounded-lg border border-blue-500 hover:bg-blue-100 transition-colors"
                      onClick={handleContact}
                    >
                      <MdMessage className="text-xl" />
                      <span className="text-sm font-medium">Contact me</span>
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-5">
                  <p>
                    <strong>{t("from")}:</strong>{" "}
                    {dataUser?.country || "No Bio For Seller"}
                  </p>
                  <p>
                    <strong>Bio:</strong>{" "}
                    {dataUser?.desc || t("defaultCountry")}
                  </p>
                  <p>
                    <strong>{t("memberSince")}:</strong> {date}
                  </p>
                  <p>
                    <strong>{t("languages")}:</strong>{" "}
                    {dataUser.languages && dataUser.languages.length > 0
                      ? dataUser.languages.map((lang, index) => (
                          <p
                            className="text-sm font-merienda italic text-gray-600"
                            key={index}
                          >
                            {lang}
                          </p>
                        ))
                      : "No Languages To Display"}
                  </p>
                  <p>
                    <strong>Years of Experience:</strong>{" "}
                    {dataUser?.yearsOfExperience
                      ? `${dataUser.yearsOfExperience}`
                      : "Not Provided"}
                  </p>
                </div>
              </div>
            )}

            <Reviews gigId={id} />
          </div>

          {/* RIGHT SECTION */}
          <div className="border border-gray-300 p-5 rounded-md shadow-md lg:sticky top-36 min-w-[280px] w-full max-h-fit">
            <div className="flex items-center justify-between">
              <h3 className="text-md md:text-lg font-medium">
                {data.shortTitle}
              </h3>
              <h3 className="text-md md:text-lg font-semibold">
                {currencySymbol}{" "}
                {new Intl.NumberFormat().format(
                  (data.price * exchangeRate).toFixed(2)
                )}
              </h3>
            </div>

            <p className="text-gray-600 text-sm mt-2">{data.shortDesc}</p>

            <div className="flex justify-between text-sm text-gray-700 mt-3">
              <div className="flex items-center gap-2">
                <img src={Clock} alt="" className="w-5" />
                <span>
                  {data.deliveryTime} {t("daysDelivery")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <img src={Recycle} alt="" className="w-5" />
                <span>
                  {data.revisionNumber} {t("revisions")}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {data.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-gray-600 text-sm"
                >
                  <FaCheckDouble className="text-xl text-[#FF8C00]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Link to={`/pay/${id}`} className="flex justify-center">
              <button className="w-full max-w-[250px] bg-[#FF8C00] text-white py-2 mt-4 text-lg font-medium rounded-md hover:bg-[#FF8C00] transition">
                {t("continue")}
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gig;
