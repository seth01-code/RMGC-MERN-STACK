import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import newRequest from "../../utils/newRequest";
import { useQuery } from "@tanstack/react-query";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { useTranslation } from "react-i18next";
import star from "../../../assets/images/star.png";
import moment from "moment";
import SellerReviews from "./SellerReviews";
import { IoMdStar } from "react-icons/io";
import Recycle from "../../../assets/images/recycle.png";
import Clock from "../../../assets/images/clock.png";
import { FaCheckDouble } from "react-icons/fa";

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

  const { isLoading: userLoading, data: userData } = useQuery({
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
                  className="w-12 h-12 rounded-full"
                  src={dataUser?.img || "../../../assets/images/noavatar.jpg"}
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
            {data.images && data.images.length > 0 ? (
              <Swiper
                spaceBetween={10}
                slidesPerView={1}
                autoplay={{ delay: 2500, disableOnInteraction: false }}
                modules={[Autoplay]}
                className="rounded-lg overflow-hidden"
              >
                {data.images.map((img, index) => (
                  <SwiperSlide key={index}>
                    <img
                      src={img}
                      alt={`Slide ${index}`}
                      className="w-full h-auto object-cover"
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <p className="text-gray-500">{t("noSamplesMessage")}</p>
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
                    src={dataUser?.img || "../../../assets/images/noavatar.jpg"}
                    alt="Seller"
                    className="w-16 h-16 rounded-full"
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
                    <strong>Portfolio/Resume LInk:</strong>{" "}
                    {dataUser.portfolioLink && dataUser.portfolioLink.length > 0
                      ? dataUser.portfolioLink.map((link, index) => (
                          <a
                            key={index}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline ml-2"
                          >
                            {link}
                          </a>
                        ))
                      : "No portfolio / Resume links available"}
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
          <div className="flex flex-col justify-between flex-1 border h-80 border-gray-300 p-5 rounded-md shadow-md lg:sticky top-36 min-w-[280px]">
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
                <img src={Clock} alt="" className="w-5 flex-shrink-0" />
                <span>
                  {data.deliveryTime} {t("daysDelivery")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <img src={Recycle} alt="" className="w-5 flex-shrink-0" />
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
