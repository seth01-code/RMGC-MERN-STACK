import { useQuery } from "@tanstack/react-query";
import React from "react";
import newRequest from "../../utils/newRequest";
import Review from "./SellerReview";
import { useTranslation } from "react-i18next";

const SellerReviews = ({ gigId }) => {
  const { t } = useTranslation();

  const { isLoading, error, data } = useQuery({
    queryKey: ["reviews", gigId],
    queryFn: () => newRequest.get(`/reviews/${gigId}`).then((res) => res.data),
    enabled: !!gigId,
  });

  return (
    <div className="mt-12 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 ">
        {t("reviews.title")}
      </h2>

      {/* Reviews Section */}
      {isLoading ? (
        <p className="text-gray-500 ">{t("reviews.loading")}</p>
      ) : error ? (
        <p className="text-red-500">{t("reviews.error")}</p>
      ) : (
        data.map((review) => <Review key={review._id} review={review} />)
      )}
    </div>
  );
};

export default SellerReviews;
