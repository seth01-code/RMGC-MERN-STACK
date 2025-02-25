import axios from "axios";

const newRequest = axios.create({
  baseURL: "http://localhost:3000/api",  // Make sure this is correct
  withCredentials: true,  // To send cookies along with the request
});

export default newRequest;
