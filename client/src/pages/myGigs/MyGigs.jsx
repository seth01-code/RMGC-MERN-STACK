import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

function MyGigs() {
  const { t } = useTranslation();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const queryClient = useQueryClient();

  // Fetch user data (including country)
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ["userData", currentUser.id],
    queryFn: () => newRequest.get(`/users/me`).then((res) => res.data),
    onError: (err) => console.error("Error fetching user data:", err),
  });

  // Fetch gigs data
  const { isLoading, error, data } = useQuery({
    queryKey: ["myGigs", currentUser.id],
    queryFn: () =>
      newRequest.get(`/gigs?userId=${currentUser.id}`).then((res) => res.data),
    onError: (err) => console.error("Error fetching gigs:", err),
  });

  // Normalize country for exchange rate
  const country = userData?.country || "Nigeria";
  const { exchangeRate, currencySymbol } = useExchangeRate(country);

  const mutation = useMutation({
    mutationFn: (id) => newRequest.delete(`/gigs/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries(
        ["myGigs", currentUser.id],
        toast.success("Gig Deleted Successfully")
      ),
    onError: (err) => toast.error("Error deleting gig:", err),
  });

  const handleDelete = (id) => {
    mutation.mutate(id);
  };

  const formatPrice = (price) => {
    const priceNumber = parseFloat(price);
    return priceNumber.toLocaleString();
  };

  return (
    <div className="myGigs flex justify-center text-gray-700 px-4 md:px-8 lg:px-16">
      {isLoading || userLoading ? (
        <p className="text-lg font-medium">{t("loading")}</p>
      ) : error || userError ? (
        <p className="text-lg font-medium text-red-500">
          {t("errorFetchingData")}: {error?.message || userError?.message}
        </p>
      ) : (
        <div className="container w-full max-w-6xl p-6 bg-white shadow-lg rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">
              {t("gigsTitle")}
            </h1>
            {currentUser.isSeller && (
              <Link to="/add">
                <button className="bg-[#1dbf73] text-white font-medium py-2 px-5 rounded-md hover:bg-[#17a866] transition">
                  {t("addNewGig")}
                </button>
              </Link>
            )}
          </div>

          {/* Table (keeps the scrollable version for mobile) */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left p-4">{t("image")}</th>
                  <th className="text-left p-4">{t("title")}</th>
                  <th className="text-left p-4">{t("price")}</th>
                  <th className="text-left p-4">{t("sales")}</th>
                  <th className="text-left p-4">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((gig) => (
                  <tr
                    key={gig._id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="p-4">
                      <img
                        className="w-16 h-10 object-cover rounded-md"
                        src={gig.cover}
                        alt={gig.title}
                      />
                    </td>
                    <td className="p-4 font-medium">{gig.title}</td>
                    <td className="p-4 text-green-600 font-medium">
                      {currencySymbol}{" "}
                      {formatPrice(
                        ((gig.price || 0) * exchangeRate).toFixed(2)
                      )}
                    </td>
                    <td className="p-4 font-medium">
                      {formatPrice(gig.sales)}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDelete(gig._id)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyGigs;
