import React, { useContext, useState } from "react";
import { VehicleContext } from "../context/VehicleContext";
import { AuthContext } from "../context/AuthContext";
import AddNewModal from "./AddNewModal";
import PaymentModal from "./PaymentModal";
import CallReviewModal from "./CallReviewModal";
import { MdRefresh, MdEdit, MdDelete } from "react-icons/md";
import { FiMessageSquare, FiChevronUp, FiChevronDown, FiRefreshCw } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import "./VehicleRow.css";

const VerificationControls = ({ field, vehicleId, initialStatus, initialCalls, initialReason }) => {
  const { verifyField } = useContext(VehicleContext);
  const [status, setStatus] = useState(initialStatus || null);
  const [calls, setCalls] = useState(initialCalls || 0);
  const [reason, setReason] = useState(initialReason || "");
  const [showModal, setShowModal] = useState(false);

  React.useEffect(() => {
    setStatus(initialStatus || null);
    setCalls(initialCalls || 0);
    setReason(initialReason || "");
  }, [initialStatus, initialCalls, initialReason]);

  const handleStatusChange = (newStatus) => {
    let finalStatus = status === newStatus ? null : newStatus;
    setStatus(finalStatus);
    verifyField(vehicleId, field, { status: finalStatus, calls, reason });
  };

  const handleCallsChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setCalls(val);
  };

  const handleCallsBlur = () => {
    verifyField(vehicleId, field, { status, calls, reason });
  };

  const incrementCalls = () => {
    const newCalls = calls + 1;
    setCalls(newCalls);
    verifyField(vehicleId, field, { status, calls: newCalls, reason });
  };

  const decrementCalls = () => {
    if (calls > 0) {
      const newCalls = calls - 1;
      setCalls(newCalls);
      verifyField(vehicleId, field, { status, calls: newCalls, reason });
    }
  };

  const handleReasonSave = (newReason) => {
    setReason(newReason);
    verifyField(vehicleId, field, { status, calls, reason: newReason });
    setShowModal(false);
  };

  return (
    <div className="compact-controls">
      <button
        className={`ctrl-btn right-btn ${status === "right" ? "active" : ""}`}
        onClick={() => handleStatusChange("right")}
        title="Valid"
      >
        ✓
      </button>
      <button
        className={`ctrl-btn wrong-btn ${status === "wrong" ? "active" : ""}`}
        onClick={() => handleStatusChange("wrong")}
        title="Invalid"
      >
        ✕
      </button>
      <div className="custom-counter">
        <input
          type="number"
          className="ctrl-input-num"
          value={calls}
          onChange={handleCallsChange}
          onBlur={handleCallsBlur}
          min="0"
          title="Calls"
        />
        <div className="counter-spinners">
          <button className="spin-btn" onClick={incrementCalls} title="Increase"><FiChevronUp /></button>
          <button className="spin-btn" onClick={decrementCalls} title="Decrease"><FiChevronDown /></button>
        </div>
      </div>
      <button 
        className="ctrl-btn note-btn" 
        onClick={() => setShowModal(true)} 
        title={reason ? `Note: ${reason}` : "Add Note"}
        style={{ color: reason ? 'var(--primary)' : 'inherit' }}
      >
        <FiMessageSquare />
      </button>

      {showModal && (
        <CallReviewModal 
          onClose={() => setShowModal(false)} 
          onSave={handleReasonSave} 
          initialReason={reason} 
        />
      )}
    </div>
  );
};

const VehicleRow = ({ vehicle, itemNum, isSelected, toggleSelect }) => {
  const { fetchVehicles, removeVehicle, resetVehicleVerification } = useContext(VehicleContext);
  const { user } = useContext(AuthContext);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const handleRowApiRefresh = async () => {
    try {
      const res = await fetch(`/api/vehicles/${vehicle._id}/refresh-api`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert("Vehicle RC documents refreshed successfully from Attestr!");
        fetchVehicles();
      } else {
        alert(data.message || "Failed to fetch vehicle API data");
      }
    } catch (err) {
      console.error(err);
      alert("Error refreshing vehicle API data");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d)) return "N/A";
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const fields = [
    { key: "fullName", value: vehicle.fullName },
    { key: "vehicleClass", value: vehicle.vehicleClass },
    { key: "mobileNumber", value: vehicle.mobileNumber },
    { key: "fitnessExpiry", value: formatDate(vehicle.fitnessExpiry) },
    { key: "taxExpiry", value: formatDate(vehicle.taxExpiry) },
    { key: "pucExpiry", value: formatDate(vehicle.pucExpiry) },
    { key: "permitExpiry", value: formatDate(vehicle.permitExpiry) },
    { key: "nationalPermitExpiry", value: formatDate(vehicle.nationalPermitExpiry) },
    { key: "insuranceExpiry", value: formatDate(vehicle.insuranceExpiry) },
  ];

  return (
    <div className={`table-row ${isSelected ? 'selected' : ''}`}>
      <div className="td-cell main-cell" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '1.2rem' }}>
        <input 
          type="checkbox" 
          checked={isSelected || false} 
          onChange={() => toggleSelect && toggleSelect(vehicle._id)} 
          style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
        />
        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', margin: '0 6px 0 10px', minWidth: '20px', display: 'inline-block', textAlign: 'right' }}>{itemNum}.</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
          <strong 
            style={{ cursor: 'pointer', textDecoration: 'none' }}
            onClick={() => {}}
          >
            {vehicle.vehicleNumber}
          </strong>
          {vehicle.deletionPending && (
            <span style={{ fontSize: '0.55rem', background: 'rgba(230, 126, 34, 0.15)', color: '#e67e22', border: '1px solid rgba(230, 126, 34, 0.3)', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              Pending Delete
            </span>
          )}
        </div>
      </div>
      
      {fields.map((f) => {
        const vStatus = vehicle.verificationStatus?.[f.key] || {};
        const isExpiryField = f.key.endsWith("Expiry");
        let cellClass = "";
        
        if (isExpiryField && vehicle[f.key]) {
          const expDate = new Date(vehicle[f.key]);
          if (!isNaN(expDate.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (expDate < today) {
              cellClass = "expiry-cell-expired";
            }
          }
        }

        return (
          <div className={`td-cell ${cellClass}`} key={f.key}>
            <div className="cell-value" title={f.value}>
              {f.value || "-"}
            </div>
            <VerificationControls
              field={f.key}
              vehicleId={vehicle._id}
              initialStatus={vStatus.status}
              initialCalls={vStatus.calls}
              initialReason={vStatus.reason}
            />
          </div>
        );
      })}
      
      <div className="td-cell actions-cell">
        <button 
          className="action-btn icon-btn refresh-btn" 
          onClick={() => resetVehicleVerification(vehicle._id)}
          title="Reset Validations"
        >
          <MdRefresh />
        </button>
        <button 
          className="action-btn icon-btn edit-btn" 
          onClick={() => setIsEditOpen(true)}
          title="Edit Vehicle"
        >
          <MdEdit />
        </button>
         <button 
          className={`action-btn icon-btn delete-btn ${vehicle.deletionPending ? 'pending' : ''}`} 
          onClick={() => {
            if (vehicle.deletionPending) {
              alert("A deletion request is already pending for this vehicle.");
              return;
            }
            removeVehicle(vehicle._id);
          }}
          disabled={vehicle.deletionPending}
          title={vehicle.deletionPending ? "Deletion request pending admin approval" : "Delete Vehicle"}
          style={vehicle.deletionPending ? { opacity: 0.5, cursor: 'not-allowed', color: '#e67e22', borderColor: '#e67e22' } : {}}
        >
          <MdDelete />
        </button>
        {user && user.role === "admin" && (
          <button 
            className="action-btn icon-btn payment-btn" 
            onClick={() => setIsPaymentOpen(true)}
            title="Payments"
          >
            <FaRupeeSign />
          </button>
        )}
        <button 
          className="action-btn icon-btn row-refresh-btn" 
          onClick={handleRowApiRefresh}
          title="Fetch API Expiries"
        >
          <FiRefreshCw />
        </button>
      </div>

      {isEditOpen && (
        <AddNewModal 
          vehicleDetails={vehicle} 
          onClose={() => setIsEditOpen(false)} 
          onSaveSuccess={() => { 
            setIsEditOpen(false);
            fetchVehicles(); 
          }} 
        />
      )}

      {isPaymentOpen && (
        <PaymentModal 
          vehicleDetails={vehicle}
          onClose={() => setIsPaymentOpen(false)}
        />
      )}
    </div>
  );
};

export default VehicleRow;
