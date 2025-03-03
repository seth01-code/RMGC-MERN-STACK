import { useQuery } from "@tanstack/react-query";
import React from "react";
import newRequest from "../../utils/newRequest";
import { useTranslation } from "react-i18next";
import { IoMdStar } from "react-icons/io";

const Review = ({ review }) => {
  const { t } = useTranslation();

  const { isLoading, error, data } = useQuery({
    queryKey: ["reviewUser", review.userId],
    queryFn: () =>
      newRequest.get(`/users/${review.userId}`).then((res) => res.data),
    enabled: !!review.userId,
  });

  return (
    <div className="flex flex-col gap-5 py-6 border-b border-gray-200">
      {/* User Info */}
      {isLoading ? (
        <p className="text-gray-500">{t("review.loading")}</p>
      ) : error ? (
        <p className="text-red-500">{t("review.error")}</p>
      ) : (
        <div className="flex items-center gap-4">
          <img
            className="h-14 w-14 object-cover rounded-full border border-gray-300"
            src={
              data.img ||
              "https://miamistonesource.com/wp-content/uploads/2018/05/no-avatar-25359d55aa3c93ab3466622fd2ce712d1.jpg"
            }
            alt={data.username}
          />
          <div>
            <span className="block text-lg font-semibold text-black">
              {data.username}
            </span>
            <span className="text-sm text-gray-500">{data.country}</span>
          </div>
        </div>
      )}

      {/* Star Rating */}
      <div className="flex items-center gap-2">
        {Array(review.star)
          .fill()
          .map((_, i) => (
            <IoMdStar key={i} className="text-[#FF8C00] text-sm" />
          ))}
        <span className="font-semibold text-[#FF8C00] text-sm">
          {review.star}
        </span>
      </div>

      {/* Review Description */}
      <p className="text-gray-700 text-sm leading-relaxed">{review.desc}</p>

      {/* Helpful Section */}
    </div>
  );
};

export default Review;
