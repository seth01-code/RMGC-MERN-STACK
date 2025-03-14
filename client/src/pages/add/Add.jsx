import React, { useEffect, useReducer, useState } from "react";
import { gigReducer, INITIAL_STATE } from "../../reducers/gigReducer";
import upload from "../../utils/upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { useTranslation } from "react-i18next";
// import { MdArrowDropDown } from "react-icons/md";

const Add = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(gigReducer, INITIAL_STATE);
  const [singleFile, setSingleFile] = useState(undefined);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [displayPrice, setDisplayPrice] = useState("");
  const [categoryInput, setCategoryInput] = useState(state.cat || ""); // Custom category input
  const [showDropdown, setShowDropdown] = useState(false);

  const categories = [
    "Web Development",
    "Graphic Design",
    "Digital Marketing",
    "Content Writing",
    "Video Editing",
    "App Development",
    "SEO (Search Engine Optimization)",
    "Social Media Management",
    "Mobile App Design",
    "Branding",
    "Photography",
    "Illustration",
    "Logo Design",
    "UI/UX Design",
    "E-commerce Development",
    "Copywriting",
    "Voice Over",
    "Translation Services",
    "Music Production",
    "Business Consulting",
    "Virtual Assistant",
    "Photography Editing",
    "3D Modeling",
    "Animation",
    "Web Scraping",
    "Game Development",
    "Custom Software Development",
    "Cybersecurity",
    "Data Analysis",
    "Blockchain Development",
    "Artificial Intelligence & Machine Learning",
    "Cloud Computing",
  ];

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const { data: userData } = useQuery({
    queryKey: ["userData", currentUser?.id],
    queryFn: () => newRequest.get(`/users/me`).then((res) => res.data),
    enabled: !!currentUser?.id, // Ensures query runs only when user is authenticated
  });

  // Ensure the hook only runs when userData is available
  const [country, setCountry] = useState("United States");

  useEffect(() => {
    if (userData?.country) {
      setCountry(userData.country);
    }
  }, [userData]);

  const { exchangeRate } = useExchangeRate(country);

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setCategoryInput(value);

    dispatch({
      type: "CHANGE_INPUT",
      payload: { name: "cat", value },
    });

    setShowDropdown(value.length > 0); // Show dropdown if user types
  };

  const handleCategorySelect = (selectedCategory) => {
    setCategoryInput(selectedCategory);
    setShowDropdown(false);

    // Update Redux state
    dispatch({
      type: "CHANGE_INPUT",
      payload: { name: "cat", value: selectedCategory },
    });
  };

  // const handleCustomCategorySubmit = () => {
  //   if (categoryInput.trim() !== "") {
  //     dispatch({
  //       type: "CHANGE_INPUT",
  //       payload: { name: "cat", value: categoryInput.trim() },
  //     });
  //     setShowDropdown(false);
  //   }
  // };

  const handleChange = (e) => {
    dispatch({
      type: "CHANGE_INPUT",
      payload: { name: e.target.name, value: e.target.value },
    });
  };

  const handleFeature = (e) => {
    e.preventDefault();
    dispatch({ type: "ADD_FEATURE", payload: e.target[0].value });
    e.target[0].value = "";
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const cover = (await upload(singleFile))?.url || "";
      const images = await Promise.all(
        [...files].map(async (file) => (await upload(file))?.url || "")
      );

      setUploading(false);
      dispatch({ type: "ADD_IMAGES", payload: { cover, images } });
      toast.success(t("images_uploaded_success"));
    } catch (err) {
      setUploading(false);
      toast.error(t("images_upload_failed"));
    }
  };

  const mutation = useMutation({
    mutationFn: (gig) => newRequest.post("/gigs", gig),
    onSuccess: () => {
      queryClient.invalidateQueries(["myGigs"]);
      toast.success(t("gig_added_success"));
      navigate("/mygigs");
    },
    onError: () => {
      toast.error(t("gig_add_failed"));
    },
  });
  const handlePriceChange = (e) => {
    let rawValue = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters

    // Format number with commas
    const formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    dispatch({
      type: "CHANGE_INPUT",
      payload: { name: "price", value: rawValue }, // Store raw numeric value
    });

    setDisplayPrice(formattedValue); // Update state for formatted display
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const priceInUSD = (state.price / exchangeRate).toFixed(0);
    mutation.mutate({ ...state, price: priceInUSD });
  };

  return (
    <div className="flex justify-center px-4 sm:px-8 py-12">
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        className="dark-toast-container"
      />
      <div className="w-full max-w-6xl">
        <h1 className="text-gray-500 text-2xl mb-8">{t("add_new_gig")}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Section */}
          <div className="space-y-5 relative">
            <label className="text-gray-500">{t("title")}</label>
            <input
              type="text"
              name="title"
              placeholder={t("title_placeholder")}
              onChange={handleChange}
              className="input-field"
            />

            {/* Category Selection */}
            <div className="space-y-5">
              <label className="text-gray-500">{t("category")}</label>
              <div className="relative">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={handleCategoryChange} // Updates state in real-time
                  onFocus={() => setShowDropdown(true)} // Show dropdown when focused
                  placeholder={t("select_category")}
                  className="w-full px-4 py-2 text-left bg-white border rounded-md shadow-sm focus:outline-none"
                />

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {categories
                      .filter((cat) =>
                        cat.toLowerCase().includes(categoryInput.toLowerCase())
                      )
                      .map((filteredCategory, index) => (
                        <div
                          key={index}
                          onClick={() => handleCategorySelect(filteredCategory)}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                        >
                          {filteredCategory}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <label className="text-gray-500">{t("cover_image")}</label>
            <input
              type="file"
              onChange={(e) => setSingleFile(e.target.files[0])}
              className="input-field"
            />
            <label className="text-gray-500">{t("upload_images")}</label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="input-field"
            />
            <button onClick={handleUpload} className="btn-green">
              {uploading ? t("uploading") : t("upload")}
            </button>
            <br />
            <label className="text-gray-500">{t("description")}</label>
            <textarea
              name="desc"
              placeholder={t("description_placeholder")}
              cols="30"
              rows="5"
              onChange={handleChange}
              className="input-field"
            ></textarea>
            {/* <button
              onClick={handleSubmit}
              className="btn-green w-auto fixed bottom-48 left-0 py-3 text-white text-center z-10"
            >
              {t("create")}
            </button> */}
          </div>

          {/* Right Section */}
          <div className="space-y-5">
            <label className="text-gray-500">{t("service_title")}</label>
            <input
              type="text"
              name="shortTitle"
              placeholder={t("service_title_placeholder")}
              onChange={handleChange}
              className="input-field"
            />

            <label className="text-gray-500">{t("short_description")}</label>
            <textarea
              name="shortDesc"
              placeholder={t("short_description_placeholder")}
              cols="30"
              rows="3"
              onChange={handleChange}
              className="input-field"
            ></textarea>

            <label className="text-gray-500">{t("delivery_time")}</label>
            <input
              type="number"
              name="deliveryTime"
              onChange={handleChange}
              className="input-field"
            />

            <label className="text-gray-500">{t("revision_number")}</label>
            <input
              type="number"
              name="revisionNumber"
              onChange={handleChange}
              className="input-field"
            />

            <label className="text-gray-500">{t("add_features")}</label>
            <form className="flex gap-2" onSubmit={handleFeature}>
              <input
                type="text"
                placeholder={t("add_feature_placeholder")}
                className="input-field"
              />
              <button type="submit" className="btn-green">
                {t("add")}
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {state?.features?.map((f) => (
                <button
                  key={f}
                  onClick={() =>
                    dispatch({ type: "REMOVE_FEATURE", payload: f })
                  }
                  className="btn-red"
                >
                  {f} ✖
                </button>
              ))}
            </div>

            <label className="text-gray-500">{t("price")}</label>
            <input
              type="text"
              name="price"
              onChange={handlePriceChange}
              value={displayPrice} // Use formatted value for display
              className="input-field"
              placeholder={t("price")}
            />
            <p className="text-gray-500">
              {t("converted_to_usd")}: $
              {state.price
                ? Math.round(state.price / exchangeRate || 0).toLocaleString()
                : "0"}{" "}
              USD
            </p>

            <button
              onClick={handleSubmit}
              className="btn-green w-full py-3 text-white text-center block "
            >
              {t("create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Add;
