import React, { useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { FaPlus, FaTimes, FaChevronDown, FaChevronUp, FaCheck, FaUndo, FaTrash } from "react-icons/fa";
import "./PaymentModal.css";

const TransactionSet = ({ set, onUpdateSet, onDeleteSet }) => {
  const [expanded, setExpanded] = useState(false);
  const [pendingDates, setPendingDates] = useState({});

  const handlePayPending = (idx) => {
    const d = pendingDates[idx];
    if (!d) {
      alert("Please select a date to mark as paid");
      return;
    }
    const newInsts = [...set.installments];
    newInsts[idx].date = d;
    onUpdateSet({ ...set, installments: newInsts });
  };

  const handleDateChange = (idx, val) => {
    setPendingDates(prev => ({ ...prev, [idx]: val }));
  };

  const handleAddInstallment = () => {
    const newInsts = [...set.installments, { date: "", amount: 0 }];
    onUpdateSet({ ...set, installments: newInsts });
  };

  const handlePendingAmountChange = (idx, val) => {
    const newInsts = [...set.installments];
    newInsts[idx].amount = parseFloat(val) || 0;
    onUpdateSet({ ...set, installments: newInsts });
  };

  const handleDeleteInstallment = (idx) => {
    if (window.confirm("Remove this installment?")) {
      const newInsts = set.installments.filter((_, i) => i !== idx);
      onUpdateSet({ ...set, installments: newInsts });
    }
  };

  const handleResetInstallment = (idx) => {
    if (window.confirm("Reset this installment to Pending?")) {
      const newInsts = [...set.installments];
      newInsts[idx].date = "";
      onUpdateSet({ ...set, installments: newInsts });
    }
  };

  const pendingCount = set.installments.filter(tx => !tx.date).length;

  return (
    <div className="pm-tx-set" style={{ background: 'rgba(0,0,0,0.03)', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '6px', border: '1px solid #000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: expanded ? '1px solid rgba(0,0,0,0.1)' : 'none', paddingBottom: expanded ? '0.3rem' : '0', marginBottom: expanded ? '0.3rem' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>Total: ₹{set.total}</strong>
          <button 
            onClick={() => onDeleteSet(set.id)}
            style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Delete Entire Payment Set"
          >
            <FaTrash size={11} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', color: '#777' }}>
            {set.installments.length} Inst {pendingCount > 0 && <span style={{ color: '#e67e22', fontWeight: 'bold' }}>({pendingCount} Pend)</span>}
          </span>
          <button 
            onClick={() => setExpanded(!expanded)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>
      </div>
      {expanded && (
        <>
          {set.installments.map((tx, idx) => {
            const isPending = !tx.date;
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '0.3rem 0', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: isPending ? '#e67e22' : '#555', fontWeight: isPending ? 'bold' : 'normal' }}>
                    Inst {idx + 1} {isPending ? "(Pending)" : `(${tx.date})`}
                  </span>
                  
                  {isPending ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#e67e22' }}>₹</span>
                      <input 
                        type="number" 
                        value={tx.amount || ""} 
                        onChange={(e) => handlePendingAmountChange(idx, e.target.value)}
                        style={{ width: '60px', padding: '2px', fontSize: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <button 
                        onClick={() => handleDeleteInstallment(idx)}
                        style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
                        title="Remove Installment"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>₹{tx.amount}</span>
                      <button 
                        onClick={() => handleResetInstallment(idx)}
                        style={{ background: 'none', border: 'none', color: '#f39c12', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                        title="Reset to Pending"
                      >
                        <FaUndo size={11} />
                      </button>
                      <button 
                        onClick={() => handleDeleteInstallment(idx)}
                        style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                        title="Remove Installment"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  )}
                </div>
                
                {isPending && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '5px', marginTop: '0.2rem' }}>
                    <input 
                      type="date" 
                      value={pendingDates[idx] || ""}
                      onChange={(e) => handleDateChange(idx, e.target.value)}
                      style={{ padding: '2px', fontSize: '0.7rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <button 
                      onClick={() => handlePayPending(idx)}
                      style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <FaCheck /> Mark Paid
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {set.installments.length < 4 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                onClick={handleAddInstallment}
                style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer' }}
              >
                + Add Sub-Installment
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PaymentModal = ({ vehicleDetails, onClose, mode = "default" }) => {
  const [historyData, setHistoryData] = useState({
    fitness: [],
    tax: [],
    puc: [],
    permit: [],
    nationalPermit: [],
    insurance: []
  });

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`/api/payments/${vehicleDetails._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.data && Object.keys(res.data).length > 0) {
          setHistoryData(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch payment history:", err);
      }
    };
    fetchHistory();
  }, [vehicleDetails._id]);

  const syncToDB = async (data) => {
    try {
      await axios.post(`/api/payments/${vehicleDetails._id}`, { historyData: data }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error("Failed to sync payment data:", err);
    }
  };

  const isInsuranceMode = mode === "insurance";

  const initialFeatures = isInsuranceMode ? [
    { key: "insurance", label: "Insurance", expiry: vehicleDetails.insuranceExpiry }
  ] : [
    { key: "fitness", label: "Fitness", expiry: vehicleDetails.fitnessExpiry },
    { key: "tax", label: "Tax", expiry: vehicleDetails.taxExpiry },
    { key: "puc", label: "PUC", expiry: vehicleDetails.pucExpiry },
    { key: "permit", label: "Permit", expiry: vehicleDetails.permitExpiry },
    { key: "nationalPermit", label: "National Permit", expiry: vehicleDetails.nationalPermitExpiry }
  ];

  const [activeForm, setActiveForm] = useState(null);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [totalAmount, setTotalAmount] = useState("");
  const [installments, setInstallments] = useState([{ date: "", amount: "" }]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d)) return "N/A";
    return d.toISOString().split("T")[0];
  };

  const getLastRenewal = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d)) return "N/A";
    d.setFullYear(d.getFullYear() - 1);
    const month = d.toLocaleString("default", { month: "short" });
    return `${month} ${d.getFullYear()}`;
  };

  const openForm = (key) => {
    setActiveForm(key);
    setInstallmentsCount(1);
    setTotalAmount("");
    setInstallments([{ date: "", amount: "" }]);
  };

  const closeForm = () => {
    setActiveForm(null);
  };

  const handleTotalAmountChange = (e) => {
    const total = e.target.value;
    setTotalAmount(total);
    recalculateLastInstallment(installmentsCount, total, installments);
  };

  const handleCountChange = (e) => {
    const count = parseInt(e.target.value) || 1;
    setInstallmentsCount(count);
    
    let newInsts = [...installments];
    if (count > newInsts.length) {
      while(newInsts.length < count) {
        newInsts.push({ date: "", amount: "" });
      }
    } else {
      newInsts = newInsts.slice(0, count);
    }
    recalculateLastInstallment(count, totalAmount, newInsts);
  };

  const handleInstallmentAmountChange = (index, val) => {
    let newInsts = [...installments];
    newInsts[index] = { ...newInsts[index], amount: val };
    recalculateLastInstallment(installmentsCount, totalAmount, newInsts);
  };

  const recalculateLastInstallment = (count, totalStr, currentInsts) => {
    const total = parseFloat(totalStr);
    let newInsts = [...currentInsts];

    if (isNaN(total) || total <= 0) {
      setInstallments(newInsts);
      return;
    }

    if (count === 1) {
      newInsts[0].amount = total;
      setInstallments(newInsts);
      return;
    }

    let sumPreceding = 0;
    let allPrecedingFilled = true;

    for (let i = 0; i < count - 1; i++) {
      const amt = parseFloat(newInsts[i].amount);
      if (isNaN(amt)) {
        allPrecedingFilled = false;
        break;
      }
      sumPreceding += amt;
    }

    if (allPrecedingFilled) {
      const remaining = total - sumPreceding;
      newInsts[count - 1].amount = remaining > 0 ? remaining : 0;
    }
    
    setInstallments(newInsts);
  };

  const handleSave = () => {
    const parsedTotal = parseFloat(totalAmount);
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      alert("Please enter a valid total amount.");
      return;
    }

    const newSet = {
      id: Date.now(),
      total: parsedTotal,
      installments: installments.map(inst => ({
        date: inst.date || "", // Empty date means pending
        amount: parseFloat(inst.amount) || 0
      }))
    };

    setHistoryData(prev => {
      const next = { ...prev, [activeForm]: [newSet, ...(prev[activeForm] || [])] };
      syncToDB(next);
      return next;
    });
    closeForm();
  };

  const updateSetHistory = (featureKey, updatedSet) => {
    setHistoryData(prev => {
      const list = prev[featureKey];
      const newIdx = list.findIndex(s => s.id === updatedSet.id);
      if (newIdx === -1) return prev;
      const newList = [...list];
      newList[newIdx] = updatedSet;
      const next = { ...prev, [featureKey]: newList };
      syncToDB(next);
      return next;
    });
  };

  const deleteSetHistory = (featureKey, setId) => {
    if (window.confirm("Are you sure you want to completely delete this entire payment set?")) {
      setHistoryData(prev => {
        const list = prev[featureKey];
        const newList = list.filter(s => s.id !== setId);
        const next = { ...prev, [featureKey]: newList };
        syncToDB(next);
        return next;
      });
    }
  };

  const renderFeatureCard = (f) => {
    const isEditing = activeForm === f.key;
    const fHistory = historyData[f.key] || [];

    if (isEditing) {
      return (
        <div key={f.key} className="pm-feature-box editing">
          <div className="pm-feature-header">
            <h3>New {f.label} Payment</h3>
            <button className="pm-icon-btn close-icon" onClick={closeForm}>
              <FaTimes />
            </button>
          </div>
          
          <div className="pm-new-entry-form">
            <div className="pm-total-summary" style={{ margin: "0 0 0.5rem 0" }}>Total: ₹{totalAmount || 0}</div>
            
            <div className="pm-form-row">
              <div className="pm-form-group">
                <label>Total (₹)</label>
                <input 
                  type="number" 
                  value={totalAmount} 
                  onChange={handleTotalAmountChange} 
                  placeholder="Amt"
                />
              </div>
              <div className="pm-form-group">
                <label>Installments</label>
                <select value={installmentsCount} onChange={handleCountChange}>
                  {[1,2,3,4].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pm-installments-container">
              <p style={{ fontSize: '0.65rem', color: '#888', margin: '0 0 0.4rem 0', fontStyle: 'italic' }}>* Leave date empty to mark as PENDING</p>
              {installments.map((inst, idx) => (
                <div key={idx} className="pm-installment-row">
                  <div className="pm-form-group">
                    <label>Date {idx + 1}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input 
                        type="date" 
                        value={inst.date}
                        onChange={(e) => {
                          let newInsts = [...installments];
                          newInsts[idx] = { ...newInsts[idx], date: e.target.value };
                          setInstallments(newInsts);
                        }}
                      />
                      {inst.date && (
                        <button 
                          onClick={() => {
                            let newInsts = [...installments];
                            newInsts[idx] = { ...newInsts[idx], date: "" };
                            setInstallments(newInsts);
                          }}
                          style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0 5px' }}
                          title="Clear Date (Mark Pending)"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="pm-form-group">
                    <label>Amt {idx === installmentsCount - 1 && installmentsCount > 1 ? "(Auto)" : "(₹)"}</label>
                    <input 
                      type="number" 
                      value={inst.amount}
                      onChange={(e) => handleInstallmentAmountChange(idx, e.target.value)}
                      readOnly={idx === installmentsCount - 1 && installmentsCount > 1}
                      style={{ backgroundColor: (idx === installmentsCount - 1 && installmentsCount > 1) ? 'rgba(0,0,0,0.05)' : 'var(--bg-color)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pm-form-actions">
              <button className="pm-cancel-btn" onClick={closeForm}>Cancel</button>
              <button className="pm-save-btn" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={f.key} className="pm-feature-box">
        <div className="pm-feature-header">
          <h3>{f.label}</h3>
          <button className="pm-icon-btn add-icon" onClick={() => openForm(f.key)} title={`Add ${f.label} Payment`}>
            <FaPlus />
          </button>
        </div>
        
        <div className="pm-feature-info">
          <div className="pm-info-row">
            <span>Expiry:</span> <strong>{formatDate(f.expiry)}</strong>
          </div>
          <div className="pm-info-row renewal-row">
            <span>Last Renewal:</span> <strong>{getLastRenewal(f.expiry)}</strong>
          </div>
        </div>

        <div className="pm-transactions">
          <h4 style={{ marginBottom: "0.5rem", color: "#888", fontSize: "0.75rem", textTransform: "uppercase" }}>Payment History</h4>
          <div className="pm-tx-list">
            {fHistory.length === 0 && <p style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'center' }}>No records</p>}
            {fHistory.map((set, setIdx) => (
              <TransactionSet 
                key={set.id} 
                set={set} 
                onUpdateSet={(updated) => updateSetHistory(f.key, updated)} 
                onDeleteSet={(setId) => deleteSetHistory(f.key, setId)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const modalContent = (
    <div className="pm-modal-overlay">
      <div className="pm-modal-content">
        <div className="pm-modal-header">
          <h2>{isInsuranceMode ? "Insurance Payments" : "Vehicle Payments"}</h2>
          <button className="pm-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="pm-navbar">
          <div className="pm-nav-item">
            <span className="pm-nav-label">Owner</span>
            <span className="pm-nav-value">{vehicleDetails.fullName || "N/A"}</span>
          </div>
          <div className="pm-nav-divider"></div>
          <div className="pm-nav-item">
            <span className="pm-nav-label">Class</span>
            <span className="pm-nav-value">{vehicleDetails.vehicleClass || "N/A"}</span>
          </div>
          <div className="pm-nav-divider"></div>
          <div className="pm-nav-item">
            <span className="pm-nav-label">Mobile</span>
            <span className="pm-nav-value">{vehicleDetails.mobileNumber || "N/A"}</span>
          </div>
        </div>

        <div className="pm-body-grid">
          {initialFeatures.map(f => renderFeatureCard(f))}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PaymentModal;
