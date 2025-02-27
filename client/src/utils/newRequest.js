import axios from "axios";

const newRequest = axios.create({
  baseURL: "https://api.renewedmindsglobalconsult.com/api", // Make sure this is correct
  withCredentials: true, // To send cookies along with the request
});

export default newRequest;
