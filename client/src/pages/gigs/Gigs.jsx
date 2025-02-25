import React, { useEffect, useRef, useState } from "react";
import down from "../../../assets/images/down.png";
import GigCard from "../../components/GigCards/GigCard";
import { useQuery } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import translation hook

const Gigs = () => {
  const { t } = useTranslation(); // Initialize translation
  const [sort, setSort] = useState("sales");
  const [open, setOpen] = useState(false);
  const minRef = useRef();
  const maxRef = useRef();

  const { search } = useLocation();

  const { isLoading, error, data, refetch } = useQuery({
    queryKey: ["gigs", sort, search],
    queryFn: () => {
      const min = minRef.current?.value || "";
      const max = maxRef.current?.value || "";
      return newRequest
        .get(`/gigs${search}&sort=${sort}&min=${min}&max=${max}`)
        .then((res) => res.data);
    },
    enabled: true,
  });

  const reSort = (type) => {
    setSort(type);
    setOpen(false);
    refetch();
  };

  useEffect(() => {
    refetch();
  }, [sort]);

  const apply = () => {
    refetch();
  };

  return (
    <div className="flex justify-center bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="container w-full max-w-7xl px-4 py-8">
        {/* Breadcrumbs */}
        {data && data.length > 0 ? (
          <span className="breadcrumbs text-sm text-gray-500 dark:text-gray-400">
            {t("siteName")} &gt; {data[0].cat} &gt;
          </span>
        ) : (
          <span className="breadcrumbs text-sm text-gray-500 dark:text-gray-400">
            {t("siteName")} &gt; Loading...
          </span>
        )}

        {/* Header Section */}

        {/* Filters & Sorting */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mt-4">
          {/* Budget Filter */}
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 w-full md:w-auto">
            <span className="font-medium">{t("budget")}</span>
            <input
              type="text"
              ref={minRef}
              placeholder={t("min")}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-24 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <input
              type="text"
              ref={maxRef}
              placeholder={t("max")}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-24 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              onClick={apply}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
            >
              {t("apply")}
            </button>
          </div>

          {/* Sorting */}
          <div className="relative flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
            <span className="text-gray-600 dark:text-gray-300 text-sm">
              {t("sortBy")}
            </span>
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg cursor-pointer transition duration-300"
              >
                <span className="font-medium text-gray-800 dark:text-white">
                  {sort === "sales" ? t("bestSelling") : t("newest")}
                </span>
                <img src={down} alt="down" className="w-4 opacity-70" />
              </button>

              {open && (
                <div className="absolute right-0 top-12 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-lg py-2">
                  <span
                    onClick={() =>
                      reSort(sort === "sales" ? "createdAt" : "sales")
                    }
                    className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition duration-300"
                  >
                    {sort === "sales" ? t("newest") : t("bestSelling")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gig Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {isLoading ? (
            <p className="text-gray-600 dark:text-gray-300 text-center">
              {t("loading")}
            </p>
          ) : error ? (
            <p className="text-red-500 text-center">{t("errorMessage")}</p>
          ) : data.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300 text-center col-span-full">
              {t("noGigsAvailable")}
            </p>
          ) : (
            data.map((gig) => <GigCard key={gig._id} item={gig} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default Gigs;
