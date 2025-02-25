import React, { useEffect, useState } from "react";
import newRequest from "../../utils/newRequest"; // Import the newRequest axios instance

const Sellers = () => {
  const [sellers, setSellers] = useState([]);  // State to hold sellers data
  const [loading, setLoading] = useState(true); // State to track loading state

  // Fetch sellers from the backend
  const fetchSellers = async () => {
    try {
      const response = await newRequest.get("/users/sellers");  // Fetch only sellers
      setSellers(response.data); // Set sellers data
    } catch (error) {
      console.error("Error fetching sellers", error);
    } finally {
      setLoading(false); // Set loading to false after API call
    }
};


  // Delete a seller by ID
  const handleDelete = async (id) => {
    try {
      await newRequest.delete(`/users/${id}`);  // Send delete request to the backend
      setSellers(sellers.filter((seller) => seller.id !== id));  // Update the state to remove the deleted seller
    } catch (error) {
      console.error("Error deleting seller", error);
    }
  };

  useEffect(() => {
    fetchSellers(); // Call the fetchSellers function when the component mounts
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Sellers List</h1>

      {loading ? (
        <p>Loading sellers...</p>
      ) : (
        <div className="overflow-x-auto">
          {sellers.length > 0 ? (
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left">Username</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => (
                  <tr key={seller._id} className="border-b">
                    <td className="px-4 py-2">{seller.username}</td>
                    <td className="px-4 py-2">{seller.email}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDelete(seller._id)}
                        className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No sellers found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Sellers;
