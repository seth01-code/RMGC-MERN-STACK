import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { cards } from "../../data";
import { useTranslation } from "react-i18next";

const Slider = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-[#f1f1f1] py-6 px-10 sm:px-6 md:px-12 text-white lg:px-20">
      <Swiper
      data-aos="fade-up"
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
        {cards.map((card) => (
          <SwiperSlide key={card.id}>
            <div className="relative max-w-[320px] sm:max-w-[280px] xs:max-w-[240px] w-full h-auto">
              <img
                src={card.img}
                alt={card.title}
                className="w-full h-[300px] sm:h-[260px] xs:h-[220px] object-cover rounded-lg brightness-75"
              />

              {/* Description Text */}
              <span className="font-medium font-serif absolute top-4 left-4 max-w-[80%]">
                {t(card.desc)
                  .split(" & ")
                  .map((line, index) => (
                    <React.Fragment key={index}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
              </span>

              {/* Title Text */}
              <span className="font-medium text-lg sm:text-xl absolute left-4 top-16 max-w-[80%]">
                {t(card.title)
                  .split(" & ")
                  .map((line, index) => (
                    <React.Fragment key={index}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
              </span>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default Slider;
