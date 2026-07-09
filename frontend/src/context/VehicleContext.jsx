import { createContext, useState, useEffect } from "react";
import * as api from "../services/api";

export const VehicleContext = createContext();

export const VehicleProvider = ({ children }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState("false");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchVehicles = async (all = "false") => {
    setLoading(true);
    try {
      const res = await api.getVehicles(all);
      setVehicles(res.data);
      setShowAll(String(all));
      setError(null);
    } catch (err) {
      setError("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  const search = async (q) => {
    setSearchQuery(q);
  };

  const verifyField = async (id, field, data) => {
    try {
      await api.updateVerification(id, { field, ...data });
      // update state
      setVehicles((prev) =>
        prev.map((v) =>
          v._id === id
            ? {
                ...v,
                verificationStatus: {
                  ...v.verificationStatus,
                  [field]: data,
                },
              }
            : v
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filter = async (field, value) => {
    setLoading(true);
    try {
      const res = await api.filterVehicles(field, value);
      setVehicles(res.data);
      if (field === "assignedDate") {
        setFilterDate(value);
      }
      setError(null);
    } catch (err) {
      setError("Failed to filter");
    } finally {
      setLoading(false);
    }
  };

  const refreshDaysVehicles = async (date, view) => {
    try {
      const res = await api.refreshDaysVehicles(date, view);
      alert(res.data.message);
      fetchVehicles(showAll);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to refresh vehicles.");
    }
  };

  const refreshVehiclesBulk = async (ids) => {
    try {
      const res = await api.refreshVehiclesBulk(ids);
      alert(res.data.message);
      fetchVehicles(showAll);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to refresh selected vehicles.");
    }
  };
  
  const resetVehicleVerification = async (id) => {
    try {
      await api.resetVerification(id);
      setVehicles((prev) =>
        prev.map((v) =>
          v._id === id
            ? { ...v, verificationStatus: {} }
            : v
        )
      );
    } catch (err) {
      console.error("Failed to reset verification", err);
    }
  };

  const removeVehicle = async (id) => {
    try {
      if (window.confirm("Are you sure you want to delete this vehicle?")) {
        const res = await api.deleteVehicle(id);
        alert(res.data.message || "Action completed");
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to delete", err);
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const removeBulkVehicles = async (vehicleIds) => {
    try {
      if (window.confirm(`Are you sure you want to delete ${vehicleIds.length} vehicles?`)) {
        const res = await api.deleteBulkVehicles(vehicleIds);
        alert(res.data.message || "Action completed");
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to bulk delete", err);
      alert(err.response?.data?.message || "Bulk delete failed");
    }
  };

  useEffect(() => {
    fetchVehicles();

    const eventSource = new EventSource("/api/sync/stream");
    
    eventSource.onmessage = (event) => {
      if (event.data === "refresh") {
        fetchVehicles();
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const updateVehicle = async (id, data) => {
    try {
      const res = await api.updateVehicle(id, data);
      setVehicles((prev) =>
        prev.map((v) => (v._id === id ? res.data : v))
      );
    } catch (err) {
      console.error("Failed to update vehicle", err);
    }
  };

  return (
    <VehicleContext.Provider
      value={{ 
        vehicles, 
        loading, 
        error, 
        fetchVehicles, 
        search, 
        verifyField, 
        filter, 
        removeVehicle, 
        removeBulkVehicles, 
        searchQuery, 
        resetVehicleVerification, 
        updateVehicle,
        showAll,
        filterDate,
        setFilterDate,
        refreshDaysVehicles,
        refreshVehiclesBulk
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};
