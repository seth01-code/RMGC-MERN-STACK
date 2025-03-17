import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import star from "../../../assets/images/star.png";
// import heart from "../../../assets/images/heart.png";
import { useExchangeRate } from "../../hooks/useExchangeRate"; // Import the hook
import { useTranslation } from "react-i18next";

const GigCard = ({ item }) => {
  const { t } = useTranslation();

  // Fetch seller data
  const {
    isLoading: gigUserLoading,
    error: gigUserError,
    data: gigUserData,
  } = useQuery({
    queryKey: [`gigUser`, item.userId],
    queryFn: () =>
      newRequest.get(`/users/${item.userId}`).then((res) => res.data),
  });

  // Fetch authenticated user's data (to get their country)
  const {
    isLoading: userLoading,
    data: userData,
    error: userError,
  } = useQuery({
    queryKey: ["authenticatedUser"],
    queryFn: () => newRequest.get("/users/me").then((res) => res.data),
  });

  // Get the user's country from the authenticated user data (this assumes the country is in the user data)
  const userCountry = userData?.country || "United States"; // Default to "United States" if no country is found
  console.log("Authenticated User Country:", userCountry); // Log user country to verify it's correct

  // Use the exchange rate hook to get the rate and symbol
  const { exchangeRate, currencySymbol } = useExchangeRate(userCountry);

  console.log("Exchange Rate:", exchangeRate); // Log exchange rate to verify

  // Format the price with commas
  const formattedPrice = new Intl.NumberFormat().format(
    item.price * exchangeRate
  );

  // Show loading state if either gigUser or user data is still loading
  if (userLoading || gigUserLoading) {
    return <div>Loading...</div>; // You can replace this with a loading spinner if you prefer
  }

  // Show error state if there's any error fetching data
  if (gigUserError || userError) {
    return (
      <div>
        {t("Gig or User Does not exist or you are not properly authenticated")}
      </div>
    );
  }

  return (
    <Link to={`/gig/${item._id}`}>
      <div className="gigCard w-[324px] h-[400px] border border-[#e8e8e8] mb-[25px] flex flex-col">
        <img
          src={item.cover}
          alt="Gig Cover"
          className="w-full h-[200px] object-cover"
        />
        <div className="info px-[20px] py-[10px] flex flex-col gap-[15px] flex-grow">
          <div className="user flex items-center gap-[10px]">
            <img
              src={
                gigUserData?.img ||
                "https://miamistonesource.com/wp-content/uploads/2018/05/no-avatar-25359d55aa3c93ab3466622fd2ce712d1.jpg"
              }
              alt={gigUserData?.username}
              className="w-[26px] h-[26px] rounded-full"
            />
            <span>{gigUserData?.username}</span>
          </div>
          {/* Truncated description */}
          <p className="text-[#111] line-clamp-3 overflow-hidden text-ellipsis">
            {item.desc}
          </p>
          <div className="star flex items-center gap-[5px]">
            <img src={star} alt="star" className="w-[14px] h-[14px]" />
            <span className="text-[#ffc108] font-bold text-[14px]">
              {!isNaN(item.totalStars / item.starNumber) &&
                Math.round(item.totalStars / item.starNumber)}
            </span>
          </div>
        </div>
        <hr className="border-0.5 border-[#e8e8e8]" />
        <div className="details px-[20px] py-[10px] flex items-center justify-between">
          {/* <img
            src={heart}
            alt="heart"
            className="w-[16px] h-[16px] cursor-pointer"
          /> */}
          <div className="price">
            <span className="text-[#999] text-[12px]">
              {t("gigCard.startingAt")}
            </span>
            <h2 className="text-[#555] text-[18px] font-normal">
              {currencySymbol} {formattedPrice}
            </h2>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default GigCard;
