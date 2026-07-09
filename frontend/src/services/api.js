import axios from "axios";

const API = axios.create({
  baseURL: "/api",
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const getVehicles = (all = "false") => API.get(all && all !== "false" ? `/vehicles?all=${all}` : "/vehicles");
export const refreshDaysVehicles = (date, view) => API.post("/vehicles/bulk-refresh-api", { date, view });
export const refreshVehiclesBulk = (ids) => API.post("/vehicles/bulk-refresh-api", { ids });
export const searchVehicles = (q) => API.get(`/vehicles/search?q=${q}`);
export const filterVehicles = (field, value) => API.get(`/vehicles/filter?field=${field}&value=${value}`);
export const addVehicle = (data) => API.post("/vehicles", data);
export const bulkVehicles = (data, options) => API.post("/vehicles/bulk", data, options);
export const updateVehicle = (id, data) => API.put(`/vehicles/${id}`, data);
export const deleteVehicle = (id) => API.delete(`/vehicles/${id}`);
export const deleteBulkVehicles = (vehicleIds) => API.post(`/vehicles/delete-bulk`, { vehicleIds });
export const updateVerification = (id, data) =>
  API.patch(`/vehicles/${id}/verify`, data);
export const fetchRc = (reg) => API.post("/vehicles/fetch-rc", { reg });
export const resetVerification = (id) => API.patch(`/vehicles/${id}/reset`);
