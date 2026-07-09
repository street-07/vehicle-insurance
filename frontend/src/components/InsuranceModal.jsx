import React, { useState, useEffect, useContext } from "react";
import "./InsuranceModal.css";
import { FiX, FiCheck, FiSearch } from "react-icons/fi";
import { VehicleContext } from "../context/VehicleContext";
import { AuthContext } from "../context/AuthContext";
import VehicleDetailsModal from "./VehicleDetailsModal";
import PaymentModal from "./PaymentModal";

const InsuranceModal = ({ onClose }) => {
  const { vehicles, updateVehicle } = useContext(VehicleContext);
  const { user } = useContext(AuthContext);
  const [filterType, setFilterType] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const [missingType, setMissingType] = useState("nodate");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredList, setFilteredList] = useState([]);
  const [activeTab, setActiveTab] = useState("tracker");
  const [detailsVehicle, setDetailsVehicle] = useState(null);
  const [paymentVehicle, setPaymentVehicle] = useState(null);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editProvider, setEditProvider] = useState("");

  useEffect(() => {
    let list = vehicles;

    // Apply Search Globally
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v => 
        (v.vehicleNumber && v.vehicleNumber.toLowerCase().includes(q)) ||
        (v.fullName && v.fullName.toLowerCase().includes(q)) ||
        (v.mobileNumber && v.mobileNumber.toLowerCase().includes(q)) ||
        (v.vehicleClass && v.vehicleClass.toLowerCase().includes(q))
      );
    }

    setFilteredList(list);
  }, [vehicles, searchQuery]);

  const handleEditClick = (v) => {
    setEditingId(v._id);
    setEditProvider(v.insuranceProvider || "");
  };

  const handleSave = async (v) => {
    const finalProvider = editProvider ? editProvider.trim() : "";
    await updateVehicle(v._id, { insuranceProvider: finalProvider });
    setEditingId(null);
  };

  const setStatus = async (v, statusStr) => {
    const updatedStatus = { ...v.verificationStatus };
    if (!updatedStatus.insuranceExpiry) updatedStatus.insuranceExpiry = { status: null, calls: 0 };
    updatedStatus.insuranceExpiry.status = statusStr;
    await updateVehicle(v._id, { verificationStatus: updatedStatus });
  };

  const renderCard = (v) => {
    const isEditing = editingId === v._id;
    const currentStatus = v.verificationStatus?.insuranceExpiry?.status;

    let formattedDate = "No Date Set";
    if (v.insuranceExpiry) {
      const d = new Date(v.insuranceExpiry);
      formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    return (
      <div key={v._id} className={`ins-card ${currentStatus ? `${currentStatus}-status` : ''}`}>
        <div className="ins-card-split">
          <div className="ins-card-left">
            <h3 
              className="ins-name" 
              style={{ 
                cursor: 'pointer', 
                textDecoration: 'none',
                background: '#3498db',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'inline-block',
                borderBottom: 'none',
                marginBottom: '8px'
              }} 
              onClick={() => setDetailsVehicle(v)}
              title="Click to view full details"
            >
              {v.vehicleNumber}
            </h3>
            <div className="ins-box">
              <label>Owner Name</label>
              <span className="ins-plate">{v.fullName || "UNNAMED"}</span>
            </div>
            <div className="ins-box">
              <label>Number</label>
              <span>{v.mobileNumber || "N/A"}</span>
            </div>
            <div className="ins-box">
              <label>Expiry Date</label>
              <span className="ins-expiry-date">{formattedDate}</span>
            </div>
          </div>

          <div className="ins-card-right">
            <div className="ins-box">
              <label>Provider Name</label>
              {isEditing ? (
                <input 
                  type="text" 
                  className="ins-input" 
                  value={editProvider} 
                  onChange={e => setEditProvider(e.target.value)} 
                  autoFocus
                />
              ) : (
                <span className="ins-provider-text">
                  {v.insuranceProvider || "Not Set"}
                </span>
              )}
            </div>

            <div className="ins-box">
              <label>Verification</label>
              <div className="ins-btn-group">
                <button 
                  className={`ins-btn ins-interested ${currentStatus === 'interested' ? 'active' : ''}`}
                  onClick={() => setStatus(v, currentStatus === 'interested' ? null : 'interested')}
                  title="Want to do insurance"
                >
                  Want
                </button>
                <button 
                  className={`ins-btn ins-done ${currentStatus === 'done' ? 'active' : ''}`}
                  onClick={() => setStatus(v, currentStatus === 'done' ? null : 'done')}
                  title="Already done insurance"
                >
                  Done
                </button>
                <button 
                  className={`ins-btn ins-not-interested ${currentStatus === 'not_interested' ? 'active' : ''}`}
                  onClick={() => setStatus(v, currentStatus === 'not_interested' ? null : 'not_interested')}
                  title="Not going to do insurance"
                >
                  No
                </button>
              </div>
            </div>

            <div className="ins-box ins-action-box" style={{ display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'center' }}>
              {isEditing ? (
                <button className="ins-btn ins-save" onClick={() => handleSave(v)}>Save</button>
              ) : (
                <button className="ins-btn ins-edit" onClick={() => handleEditClick(v)}>Edit Provider</button>
              )}
              {user && user.role === "admin" && (
                <button 
                  className="ins-btn" 
                  style={{ background: 'var(--primary)', color: 'white', border: '1px solid var(--primary)', borderRadius: '4px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 'bold' }} 
                  onClick={() => setPaymentVehicle(v)}
                >
                  Payments
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabList = filteredList
    .filter(v => {
      if (activeTab === "missing") {
        if (missingType === "nodate") return !v.insuranceExpiry;
        if (missingType === "nonumber") return !v.mobileNumber || v.mobileNumber.trim() === "";
        if (missingType === "noname") return !v.fullName || v.fullName.trim() === "" || v.fullName === "UNNAMED";
        if (missingType === "noprovider") return !v.insuranceProvider || v.insuranceProvider.trim() === "";
      }
      return !!v.insuranceExpiry;
    })
    .sort((a, b) => {
      if (!a.insuranceExpiry && !b.insuranceExpiry) return 0;
      if (!a.insuranceExpiry) return 1;
      if (!b.insuranceExpiry) return -1;
      return new Date(a.insuranceExpiry) - new Date(b.insuranceExpiry);
    });

  const isNotInterested = (v) => v.verificationStatus?.insuranceExpiry?.status === 'not_interested';

  const noList = tabList.filter(isNotInterested);
  const activeTabList = tabList.filter(v => !isNotInterested(v));

  const topList = activeTabList.filter(v => {
    if (activeTab !== "tracker") return true;

    // 1. Explicit targeted filters
    if (filterType === "unnamed") {
      return !v.fullName || v.fullName.trim() === "" || v.fullName === "UNNAMED";
    }

    // 2. Helpers
    const isUnnamed = !v.fullName || v.fullName.trim() === "" || v.fullName === "UNNAMED";

    // 3. Default View (Show all needing attention + current month)
    if (filterType === "all") {
      const d = new Date(v.insuranceExpiry);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    }

    // 4. Date-based specific filters
    const d = new Date(v.insuranceExpiry);
    if (filterType === "date" && filterValue) {
      return d.toISOString().split("T")[0] === filterValue;
    } else if (filterType === "month" && filterValue) {
      return (d.getMonth() + 1).toString() === filterValue;
    } else if (filterType === "year" && filterValue) {
      return d.getFullYear().toString() === filterValue;
    }

    return false;
  });

  const restList = activeTabList.filter(v => !topList.includes(v));

  return (
    <div className="modal-overlay">
      <div className="insurance-modal">
        <div className="insurance-navbar">
          <div className="ins-nav-left">
            <h2>Insurance Tracker</h2>
            <div className="ins-tabs">
              <button 
                className={`ins-tab-btn ${activeTab === 'tracker' ? 'active' : ''}`}
                onClick={() => setActiveTab('tracker')}
              >
                Calendar
              </button>
              <button 
                className={`ins-tab-btn ${activeTab === 'missing' ? 'active' : ''}`}
                onClick={() => setActiveTab('missing')}
              >
                Missing Info
              </button>
            </div>
          </div>
          <div className="ins-actions">
            <div className="ins-filter-group">
              {activeTab === 'tracker' ? (
                <>
                  <select 
                    className="nav-btn outline ins-select" 
                    value={filterType} 
                    onChange={e => {setFilterType(e.target.value); setFilterValue("");}}
                  >
                    <option value="all">Sort/Filter Options</option>
                    <option value="unnamed">Unnamed Owners</option>
                    <option value="date">Filter by Date</option>
                    <option value="month">Filter by Month</option>
                    <option value="year">Filter by Year</option>
                  </select>

                  {filterType === "month" ? (
                    <select 
                      className="nav-btn outline ins-select" 
                      value={filterValue} 
                      onChange={e => setFilterValue(e.target.value)}
                    >
                      <option value="">Select Month...</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  ) : filterType === "year" ? (
                    <select 
                      className="nav-btn outline ins-select" 
                      value={filterValue} 
                      onChange={e => setFilterValue(e.target.value)}
                    >
                      <option value="">Select Year...</option>
                      {Array.from({ length: 16 }, (_, i) => 2020 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="date" 
                      className="nav-btn outline ins-val-input" 
                      value={filterType === "date" ? filterValue : ""}
                      onChange={e => setFilterValue(e.target.value)}
                      disabled={filterType !== "date"}
                      style={filterType !== "date" ? { opacity: 0.5 } : {}}
                    />
                  )}
                </>
              ) : (
                <select 
                  className="nav-btn outline ins-select" 
                  value={missingType} 
                  onChange={e => setMissingType(e.target.value)}
                >
                  <option value="nodate">Missing Dates</option>
                  <option value="nonumber">Missing Number</option>
                  <option value="noname">Missing Name</option>
                  <option value="noprovider">Missing Provider</option>
                </select>
              )}
            </div>
          <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="nav-btn outline ins-search-modern" 
                placeholder="Search plate, name, mobile..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="close-btn" onClick={onClose}><FiX /></button>
          </div>
        </div>

        <div className="insurance-content">
          {filteredList.length === 0 && <p style={{ gridColumn: '1/-1' }}>No insurance records found.</p>}
          
          {topList.length > 0 && topList.map(renderCard)}

          {restList.length > 0 && (
            <div className="ins-divider-container">
              <div className="ins-divider-line"></div>
              <span>Subsequent Expiries</span>
              <div className="ins-divider-line"></div>
            </div>
          )}

          {restList.length > 0 && restList.map(renderCard)}

          {noList.length > 0 && (
            <div className="ins-divider-container">
              <div className="ins-divider-line"></div>
              <span>Not Interested (No)</span>
              <div className="ins-divider-line"></div>
            </div>
          )}

          {noList.length > 0 && noList.map(renderCard)}
        </div>
      </div>
      
      {detailsVehicle && (
        <VehicleDetailsModal 
          vehicle={detailsVehicle} 
          onClose={() => setDetailsVehicle(null)} 
        />
      )}

      {paymentVehicle && (
        <PaymentModal 
          vehicleDetails={paymentVehicle} 
          onClose={() => setPaymentVehicle(null)} 
          mode="insurance"
        />
      )}
    </div>
  );
};

export default InsuranceModal;
