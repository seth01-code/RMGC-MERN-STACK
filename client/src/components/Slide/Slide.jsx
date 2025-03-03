import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import newRequest from "../../utils/newRequest"; // Your Axios instance

const Slide = () => {
  const { t } = useTranslation();
  const [gigs, setGigs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sellersRes = await newRequest.get("/users/sellers");
        const sellersData = sellersRes.data;

        const gigsRes = await newRequest.get("/gigs");
        const gigsData = gigsRes.data;

        const mergedData = gigsData.map((gig) => {
          const seller = sellersData.find(
            (seller) => seller._id === gig.userId
          );
          return {
            ...gig,
            sellerUsername: seller?.username || "Unknown",
            sellerImg: seller?.img,
          };
        });

        // Filter out duplicate categories
        const uniqueCategories = new Set();
        const filteredGigs = mergedData.filter((gig) => {
          if (uniqueCategories.has(gig.cat)) {
            return false; // Skip this gig as its category has already been shown
          }
          uniqueCategories.add(gig.cat); // Add the category to the set
          return true; // Include this gig
        });

        setGigs(filteredGigs);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-[#f1f1f1] py-6 px-10 sm:px-6 md:px-12 text-white lg:px-20">
      {gigs.length > 0 ? (
        <Swiper
          {...(window.innerWidth >= 768 ? { "data-aos": "fade-up" } : {})}
          spaceBetween={15}
          slidesPerGroup={1}
          modules={[Autoplay]}
          autoplay={{ delay: 2500, disableOnInteraction: false }}
          loop={false}
          breakpoints={{
            1400: { slidesPerView: 4, spaceBetween: 40 },
            1200: { slidesPerView: 3, spaceBetween: 30 },
            1024: { slidesPerView: 3, spaceBetween: 25 },
            768: { slidesPerView: 2, spaceBetween: 20 },
            576: { slidesPerView: 1.5, spaceBetween: 15 },
            420: { slidesPerView: 1.2, spaceBetween: 10 },
            320: { slidesPerView: 1, spaceBetween: 8 },
          }}
        >
          {gigs.map((gig) => (
            <SwiperSlide key={gig._id}>
              <Link to={`/gig/${gig._id}`}>
                <div className="projectCard w-full h-auto rounded-lg cursor-pointer shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105 flex flex-col">
                  <img
                    src={gig.cover}
                    alt={t("slide.projectImageAlt")}
                    className="w-full h-[200px] sm:h-[180px] xs:h-[160px] object-cover"
                  />
                  <div className="info flex items-center gap-3 p-3 bg-white shadow-md rounded-b-lg flex-grow">
                    <img
                      src={
                        gig.sellerImg ||
                        "https://miamistonesource.com/wp-content/uploads/2018/05/no-avatar-25359d55aa3c93ab3466622fd2ce712d1.jpg"
                      }
                      alt={t("slide.profileImageAlt")}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="texts">
                      <h2 className="text-sm text-black font-medium truncate">
                        {t("slide.category", { category: gig.cat })}
                      </h2>
                      <span className="text-xs text-gray-600">
                        {gig.sellerUsername}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <p className="text-center text-gray-700 font-medium text-lg py-10">
          No gigs available yet.
        </p>
      )}
    </div>
  );
};

export default Slide;
