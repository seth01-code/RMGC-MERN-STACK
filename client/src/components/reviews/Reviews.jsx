import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import newRequest from "../../utils/newRequest";
import Review from "../review/Review";
import { useTranslation } from "react-i18next";

const Reviews = ({ gigId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { isLoading, error, data } = useQuery({
    queryKey: ["reviews", gigId],
    queryFn: () => newRequest.get(`/reviews/${gigId}`).then((res) => res.data),
    enabled: !!gigId,
  });

  const mutation = useMutation({
    mutationFn: (review) => newRequest.post("/reviews", review),
    onSuccess: () => queryClient.invalidateQueries(["reviews", gigId]),
  });

  const [desc, setDesc] = useState("");
  const [star, setStar] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    mutation.mutate(
      { gigId, desc, star },
      {
        onSuccess: () => {
          setDesc("");
          setStar(1);
          setIsSubmitting(false);
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  return (
    <div className="mt-12 p-6 bg-white  rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 ">{t("reviews.title")}</h2>

      {/* Reviews Section */}
      {isLoading ? (
        <p className="text-gray-500 ">{t("reviews.loading")}</p>
      ) : error ? (
        <p className="text-red-500">{t("reviews.error")}</p>
      ) : (
        data.map((review) => <Review key={review._id} review={review} />)
      )}

      {/* Add a Review */}
      <div className="mt-6 bg-gray-50  p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("reviews.addReviewTitle")}</h3>

        <form className="mt-4 space-y-5" onSubmit={handleSubmit}>
          <textarea
            placeholder={t("reviews.placeholder")}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full p-3 border border-gray-300  rounded-lg bg-white  focus:ring-2 focus:ring-green-500 focus:outline-none"
            rows="4"
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-gray-700  font-medium">{t("reviews.ratingLabel")}</label>
            <select
              value={star}
              onChange={(e) => setStar(Number(e.target.value))}
              className="p-3 border border-gray-300  bg-white  focus:ring-2 focus:ring-[#FF8C00] focus:outline-none"
            >
              <option value={1}>⭐ 1 Star</option>
              <option value={2}>⭐⭐ 2 Stars</option>
              <option value={3}>⭐⭐⭐ 3 Stars</option>
              <option value={4}>⭐⭐⭐⭐ 4 Stars</option>
              <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-full py-3 px-6 bg-[#FF8C00] hover:bg-[#FFA500] text-white font-semibold rounded-lg transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {t("reviews.submitButton")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Reviews;
