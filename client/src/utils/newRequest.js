import axios from "axios";

const newRequest = axios.create({
  baseURL: "https://api.renewedmindsglobalconsult.com/api",
  withCredentials: true,
});

// Interceptor for token expiration
newRequest.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("currentUser");
      window.location.href = "/login"; // Or use navigate if in a component
    }
    return Promise.reject(err);
  }
);

export default newRequest;
