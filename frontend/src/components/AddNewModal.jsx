import React, { useState } from "react";
import { createPortal } from "react-dom";
import * as api from "../services/api";
import "./AddNewModal.css";

const AddNewModal = ({ vehicleDetails, onClose, onSaveSuccess }) => {
  const isEditMode = !!vehicleDetails;
  const [vehicleNumber, setVehicleNumber] = useState(vehicleDetails?.vehicleNumber || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    fullName: vehicleDetails?.fullName || "",
    vehicleClass: vehicleDetails?.vehicleClass || "",
    mobileNumber: vehicleDetails?.mobileNumber || "",
    fitnessExpiry: vehicleDetails?.fitnessExpiry ? vehicleDetails.fitnessExpiry.split('T')[0] : "",
    taxExpiry: vehicleDetails?.taxExpiry ? vehicleDetails.taxExpiry.split('T')[0] : "",
    pucExpiry: vehicleDetails?.pucExpiry ? vehicleDetails.pucExpiry.split('T')[0] : "",
    permitExpiry: vehicleDetails?.permitExpiry ? vehicleDetails.permitExpiry.split('T')[0] : "",
    nationalPermitExpiry: vehicleDetails?.nationalPermitExpiry ? vehicleDetails.nationalPermitExpiry.split('T')[0] : "",
    insuranceExpiry: vehicleDetails?.insuranceExpiry ? vehicleDetails.insuranceExpiry.split('T')[0] : ""
  });

  const handleFetch = async () => {
    if (!vehicleNumber.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.fetchRc(vehicleNumber.trim().toUpperCase());
      const data = res.data.data;
      if (!data) throw new Error("RC details not found");

      setFormData(prev => ({
        ...prev,
        fullName: data.ownerName || prev.fullName,
        vehicleClass: data.vehicleClass || data.vehicleCategory || data.vehicleModel || prev.vehicleClass,
        fitnessExpiry: data.fitnessUpto ? data.fitnessUpto.split('T')[0] : prev.fitnessExpiry,
        taxExpiry: data.taxUpto ? data.taxUpto.split('T')[0] : prev.taxExpiry,
        pucExpiry: data.pucUpto ? data.pucUpto.split('T')[0] : prev.pucExpiry,
        permitExpiry: data.permitUpto ? data.permitUpto.split('T')[0] : prev.permitExpiry,
        nationalPermitExpiry: data.nationalPermitUpto ? data.nationalPermitUpto.split('T')[0] : prev.nationalPermitExpiry,
        insuranceExpiry: data.insuranceUpto ? data.insuranceUpto.split('T')[0] : prev.insuranceExpiry
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch remote RC data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      setError("Vehicle number is required");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        ...formData
      };
      if (isEditMode) {
        await api.updateVehicle(vehicleDetails._id, payload);
      } else {
        await api.addVehicle(payload);
      }
      onSaveSuccess();
      onClose();
    } catch (err) {
      setError("Failed to save vehicle: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isEditMode ? "Edit Vehicle" : "Add New Vehicle"}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="rc-fetch-row">
          <input 
            type="text" 
            placeholder="ENTER VEHICLE NUMBER..." 
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            disabled={isEditMode}
            style={isEditMode ? { background: 'var(--bg-color)', color: '#888', opacity: 0.7 } : {}}
          />
          <button className="fetch-btn" onClick={handleFetch} disabled={loading}>
            {loading ? "Fetching..." : "Fetch API"}
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Vehicle Class</label>
              <input type="text" name="vehicleClass" value={formData.vehicleClass} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Number 📱</label>
              <input type="text" name="mobileNumber" placeholder="Enter manually" value={formData.mobileNumber} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Fitness Expiry (YYYY-MM-DD)</label>
              <input type="date" name="fitnessExpiry" value={formData.fitnessExpiry} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Tax Expiry</label>
              <input type="date" name="taxExpiry" value={formData.taxExpiry} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>PUC Expiry</label>
              <input type="date" name="pucExpiry" value={formData.pucExpiry} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Permit Expiry (PP)</label>
              <input type="date" name="permitExpiry" value={formData.permitExpiry} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>National Permit Expiry</label>
              <input type="date" name="nationalPermitExpiry" value={formData.nationalPermitExpiry} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Insurance Expiry</label>
              <input type="date" name="insuranceExpiry" value={formData.insuranceExpiry} onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className="save-btn" disabled={loading}>
            {isEditMode ? "Update Details" : "Save Vehicle"}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AddNewModal;
