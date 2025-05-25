import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
// import { Autoplay } from "swiper/modules";
import "swiper/css";
import newRequest from "../../utils/newRequest";
import { useQuery } from "@tanstack/react-query";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { useTranslation } from "react-i18next";
import star from "../../../assets/images/star.png";
import moment from "moment";
import SellerReviews from "./SellerReviews";
import { IoMdStar } from "react-icons/io";
import { FaCheckDouble, FaClock } from "react-icons/fa";
import { BiRevision } from "react-icons/bi";

const GigDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("currentUser"));
    setCurrentUser(storedUser);
  }, []);

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

  const date = moment(dataUser?.createdAt).format("DD MMMM, YYYY");
  const userCountry = userData?.country || "United States";
  const { exchangeRate, currencySymbol } = useExchangeRate(userCountry);

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
                <Link
                  to={
                    currentUser?.isAdmin
                      ? "/admin"
                      : currentUser?.isSeller
                      ? "/seller"
                      : "/"
                  }
                >
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
                  className="w-12 h-12 rounded-full object-cover"
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

            {/* Swiper Slider */}
            {data && (
              <>
                {console.log("Data Object:", data)}

                {data.images?.length > 0 ||
                data.videos?.length > 0 ||
                data.documents?.length > 0 ? (
                  <div className="relative">
                    {/* Custom Prev Arrow */}
                    <div className="swiper-button-prev-custom absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-white shadow-md p-2 rounded-full cursor-pointer hover:bg-gray-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-gray-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </div>

                    {/* Custom Next Arrow */}
                    <div className="swiper-button-next-custom absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-white shadow-md p-2 rounded-full cursor-pointer hover:bg-gray-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-gray-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>

                    {/* Swiper Component */}
                    <Swiper
                      spaceBetween={10}
                      slidesPerView={1}
                      navigation={{
                        prevEl: ".swiper-button-prev-custom",
                        nextEl: ".swiper-button-next-custom",
                      }}
                      modules={[Navigation]}
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

                        console.log(`File #${index}:`, fileUrl, {
                          isImage,
                          isVideo,
                          isPDF,
                        });

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
                                controls
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
                  </div>
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
                    className="w-16 h-16 object-cover rounded-full"
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
                            <img
                              src={star}
                              alt="star"
                              key={i}
                              className="w-4 h-4"
                            />
                          ))}
                        <span className="text-sm">
                          {Math.round(data.totalStars / data.starNumber)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-5">
                  <p>
                    <strong>{t("from")}:</strong>{" "}
                    {dataUser?.country || t("defaultCountry")}
                  </p>
                  <p>
                    <strong>{t("memberSince")}:</strong> {date}
                  </p>
                  <p>
                    <strong>{t("languages")}:</strong>{" "}
                    {dataUser.languages && dataUser.languages.length > 0
                      ? dataUser.languages.map((lang, index) => (
                          <p
                            className="text-sm font-[cursive] italic text-gray-600"
                            key={index}
                          >
                            {lang}
                          </p>
                        ))
                      : "No Languages To Display"}
                  </p>
                </div>
              </div>
            )}

            <SellerReviews gigId={id} />
          </div>

          {/* RIGHT SECTION */}
          <div className="border border-gray-300 p-5 rounded-md shadow-md lg:sticky top-36 min-w-[280px] w-full max-h-fit">
            {/* Title & Price */}
            <div className="flex flex-col items-start">
              <h3 className="text-md md:text-lg font-medium">
                {data.shortTitle}
              </h3>
              <h3 className="text-md mt-2 md:text-lg font-semibold">
                {currencySymbol}{" "}
                {new Intl.NumberFormat().format(
                  (data.price * exchangeRate).toFixed(2)
                )}
              </h3>
            </div>

            {/* Short Description */}
            <p className="text-gray-600 text-sm mt-2 flex-grow">
              {data.shortDesc}
            </p>

            {/* Delivery Time & Revisions */}
            <div className="flex justify-between text-sm text-gray-700 mt-3">
              <div className="flex items-center gap-2">
                <FaClock className="text-[1.25rem] text-black flex-shrink-0" />
                <span>
                  {data.deliveryTime} {t("daysDelivery")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BiRevision className="text-[1.25rem] text-black flex-shrink-0" />
                <span>
                  {data.revisionNumber} {t("revisions")}
                </span>
              </div>
            </div>

            {/* Features List - Fills Remaining Space */}
            <div className="mt-4 flex flex-col flex-grow justify-start">
              {data.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-gray-600 text-sm flex-grow"
                >
                  <FaCheckDouble className="text-xl text-[#FF8C00]" />
                  <span className="flex-grow">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GigDetail;
