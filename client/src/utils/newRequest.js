import axios from "axios";

const newRequest = axios.create({
  baseURL: "https://rmgc-mern-stack-6.onrender.com/api",  // Make sure this is correct
  withCredentials: true,  // To send cookies along with the request
});

export default newRequest;
