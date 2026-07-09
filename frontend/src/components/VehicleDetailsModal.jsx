import React, { useState, useEffect } from "react";
import "./VehicleDetailsModal.css";
import { FiX, FiSearch, FiFilter, FiPlus, FiEdit, FiRefreshCcw, FiTrash2, FiSave, FiCheckCircle } from "react-icons/fi";
import axios from "axios";

const VehicleDetailsModal = ({ vehicle, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [historyData, setHistoryData] = useState({
    fitness: [],
    tax: [],
    puc: [],
    permit: [],
    nationalPermit: [],
    insurance: []
  });
  const [loading, setLoading] = useState(true);

  // Form states for Add / Edit
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  
  const [dateRenewal, setDateRenewal] = useState("");
  const [dateExpiry, setDateExpiry] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [instCount, setInstCount] = useState(1);
  const [installments, setInstallments] = useState([{ date: "", amount: "" }]);

  // Fetch payment history from DB
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/payments/${vehicle._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data && Object.keys(res.data).length > 0) {
        setHistoryData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch payment history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [vehicle._id]);

  // Sync to database
  const syncToDB = async (updatedData) => {
    try {
      await axios.post(`/api/payments/${vehicle._id}`, { historyData: updatedData }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error("Failed to sync payment data:", err);
      alert("Failed to sync changes to database.");
    }
  };

  // Open form for adding
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setDateRenewal("");
    setDateExpiry("");
    setTotalAmount("");
    setInstCount(1);
    setInstallments([{ date: "", amount: "" }]);
    setShowForm(true);
  };

  // Open form for editing
  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setDateRenewal(record.dateRenewal || "");
    setDateExpiry(record.dateExpiry || "");
    setTotalAmount(record.total.toString());
    setInstCount(record.installments ? record.installments.length : 1);
    setInstallments(
      record.installments
        ? record.installments.map(inst => ({ date: inst.date || "", amount: inst.amount.toString() }))
        : [{ date: "", amount: "" }]
    );
    setShowForm(true);
  };

  // Recalculate installments when count or total changes
  useEffect(() => {
    const total = parseFloat(totalAmount) || 0;
    if (total <= 0) return;

    let newInsts = [...installments];
    
    // Resize array
    if (instCount > newInsts.length) {
      while (newInsts.length < instCount) {
        newInsts.push({ date: "", amount: "" });
      }
    } else {
      newInsts = newInsts.slice(0, instCount);
    }

    // Split equally as default
    const share = Math.floor(total / instCount);
    for (let i = 0; i < instCount - 1; i++) {
      newInsts[i].amount = share.toString();
    }
    // Set last installment to the remainder
    newInsts[instCount - 1].amount = (total - share * (instCount - 1)).toString();

    setInstallments(newInsts);
  }, [instCount, totalAmount]);

  // Save Add/Edit Record
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    const parsedTotal = parseFloat(totalAmount);
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      alert("Please enter a valid total amount.");
      return;
    }

    const savedRecord = {
      id: editingRecord ? editingRecord.id : Date.now(),
      dateRenewal,
      dateExpiry,
      total: parsedTotal,
      installments: installments.map(inst => ({
        date: inst.date || "",
        amount: parseFloat(inst.amount) || 0
      }))
    };

    let updatedInsurance = [...(historyData.insurance || [])];
    
    if (editingRecord) {
      // Edit mode
      updatedInsurance = updatedInsurance.map(rec => rec.id === editingRecord.id ? savedRecord : rec);
    } else {
      // Add mode
      updatedInsurance = [savedRecord, ...updatedInsurance];
    }

    const updatedHistory = { ...historyData, insurance: updatedInsurance };
    setHistoryData(updatedHistory);
    await syncToDB(updatedHistory);
    setShowForm(false);
  };

  // Delete Record
  const handleDeleteRecord = async (recordId) => {
    if (window.confirm("Are you sure you want to delete this insurance record?")) {
      const updatedInsurance = (historyData.insurance || []).filter(rec => rec.id !== recordId);
      const updatedHistory = { ...historyData, insurance: updatedInsurance };
      setHistoryData(updatedHistory);
      await syncToDB(updatedHistory);
    }
  };

  // Refresh (Reset all installment dates in a record to pending)
  const handleResetRecord = async (recordId) => {
    if (window.confirm("Reset all installments in this record to Pending?")) {
      const updatedInsurance = (historyData.insurance || []).map(rec => {
        if (rec.id === recordId) {
          return {
            ...rec,
            installments: rec.installments.map(inst => ({ ...inst, date: "" }))
          };
        }
        return rec;
      });
      const updatedHistory = { ...historyData, insurance: updatedInsurance };
      setHistoryData(updatedHistory);
      await syncToDB(updatedHistory);
    }
  };

  // Filter records based on search query
  const records = (historyData.insurance || []).filter(rec => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (rec.dateRenewal && rec.dateRenewal.toLowerCase().includes(q)) ||
      (rec.dateExpiry && rec.dateExpiry.toLowerCase().includes(q)) ||
      (rec.total.toString().includes(q))
    );
  });

  return (
    <div className="modal-overlay">
      <div className="vdm-modal">
        {/* Navbar */}
        <div className="vdm-navbar">
          <h2>
            {vehicle?.vehicleNumber} &nbsp;&nbsp;|&nbsp;&nbsp;
            <span style={{ fontSize: '0.9rem', color: '#7f8c8d', fontFamily: 'var(--sans)' }}>
              {vehicle?.fullName || "UNNAMED"} &nbsp;&nbsp;•&nbsp;&nbsp; {vehicle?.mobileNumber || "N/A"}
            </span>
          </h2>
          <div className="vdm-nav-actions">
            {!showForm && (
              <>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="nav-btn outline vdm-search"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="vdm-add-btn" onClick={handleOpenAdd} title="Add New Record">
                  <FiPlus /> Add Record
                </button>
              </>
            )}
            <button className="close-btn" onClick={onClose} style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
              <FiX />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="vdm-content">
          {showForm ? (
            /* ADD / EDIT RECORD FORM */
            <div className="vdm-form-panel" style={{ background: '#f0f0f3', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-outer)' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)' }}>
                {editingRecord ? "Edit Insurance Record" : "Add Insurance Record"}
              </h3>
              <form onSubmit={handleSaveRecord}>
                <div className="vdm-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="vdm-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Renewal Date</label>
                    <input type="date" value={dateRenewal} onChange={e => setDateRenewal(e.target.value)} style={{ padding: '0.6rem', border: 'var(--clay-border)', borderRadius: '8px', background: 'var(--bg-color)' }} />
                  </div>
                  <div className="vdm-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Expiry Date</label>
                    <input type="date" value={dateExpiry} onChange={e => setDateExpiry(e.target.value)} style={{ padding: '0.6rem', border: 'var(--clay-border)', borderRadius: '8px', background: 'var(--bg-color)' }} />
                  </div>
                  <div className="vdm-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Total Amount (₹)</label>
                    <input type="number" placeholder="Enter total amount" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} style={{ padding: '0.6rem', border: 'var(--clay-border)', borderRadius: '8px', background: 'var(--bg-color)' }} required />
                  </div>
                  <div className="vdm-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Installments Count</label>
                    <select value={instCount} onChange={e => setInstCount(parseInt(e.target.value))} style={{ padding: '0.6rem', border: 'var(--clay-border)', borderRadius: '8px', background: 'var(--bg-color)' }}>
                      <option value={1}>1 Installment</option>
                      <option value={2}>2 Installments</option>
                      <option value={3}>3 Installments</option>
                      <option value={4}>4 Installments</option>
                    </select>
                  </div>
                </div>

                <div className="vdm-installments-section" style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '12px', border: 'var(--clay-border)', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Installments Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {installments.map((inst, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '0.5rem', background: '#f0f0f3', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>Installment {idx + 1}</span>
                        <label style={{ fontSize: '0.75rem' }}>Payment Date (leave empty if pending)</label>
                        <input 
                          type="date" 
                          value={inst.date} 
                          onChange={e => {
                            const updated = [...installments];
                            updated[idx].date = e.target.value;
                            setInstallments(updated);
                          }}
                          style={{ padding: '0.4rem', border: 'var(--clay-border)', borderRadius: '6px', background: 'var(--bg-color)' }} 
                        />
                        <label style={{ fontSize: '0.75rem', marginTop: '5px' }}>Amount (₹)</label>
                        <input 
                          type="number" 
                          value={inst.amount} 
                          onChange={e => {
                            const updated = [...installments];
                            updated[idx].amount = e.target.value;
                            setInstallments(updated);
                          }}
                          style={{ padding: '0.4rem', border: 'var(--clay-border)', borderRadius: '6px', background: 'var(--bg-color)' }} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="vdm-action-btn" onClick={() => setShowForm(false)} style={{ borderRadius: '8px', width: 'auto', height: 'auto', padding: '0.6rem 1.5rem', boxShadow: 'var(--shadow-outer-sm)' }}>
                    Cancel
                  </button>
                  <button type="submit" className="vdm-add-btn" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <FiSave /> Save Record
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* INSURANCE RECORDS LIST */
            <div className="vdm-records-container">
              {loading ? (
                <p>Loading insurance records...</p>
              ) : records.length === 0 ? (
                <p>No insurance payment records found. Click "Add Record" to create one.</p>
              ) : (
                records.map((record) => {
                  // Calculate due amount
                  const dueAmt = record.installments
                    ? record.installments.filter(inst => !inst.date).reduce((sum, inst) => sum + inst.amount, 0)
                    : 0;

                  return (
                    <div key={record.id} className="vdm-long-tile">
                      <div className="vdm-info-group">
                        <span className="vdm-label">PROVIDER</span>
                        <span className="vdm-value highlight-alt">{vehicle?.insuranceProvider || "Not Set"}</span>
                      </div>
                      <div className="vdm-info-group">
                        <span className="vdm-label">RENEWAL</span>
                        <span className="vdm-value">{record.dateRenewal ? new Date(record.dateRenewal).toLocaleDateString() : "N/A"}</span>
                      </div>
                      <div className="vdm-info-group">
                        <span className="vdm-label">EXPIRY</span>
                        <span className="vdm-value">{record.dateExpiry ? new Date(record.dateExpiry).toLocaleDateString() : "N/A"}</span>
                      </div>

                      <div className="vdm-divider"></div>

                      <div className="vdm-info-group">
                        <span className="vdm-label">INST. 1</span>
                        <span className="vdm-value">{record.installments?.[0] ? `₹ ${record.installments[0].amount}` : "-"}</span>
                      </div>
                      <div className="vdm-info-group">
                        <span className="vdm-label">INST. 2</span>
                        <span className="vdm-value">{record.installments?.[1] ? `₹ ${record.installments[1].amount}` : "-"}</span>
                      </div>
                      <div className="vdm-info-group">
                        <span className="vdm-label">INST. 3</span>
                        <span className="vdm-value">{record.installments?.[2] ? `₹ ${record.installments[2].amount}` : "-"}</span>
                      </div>
                      <div className="vdm-info-group">
                        <span className="vdm-label">DUE</span>
                        <span className={`vdm-value ${dueAmt > 0 ? "due-text" : ""}`}>₹ {dueAmt}</span>
                      </div>
                      <div className="vdm-info-group">
                        <span className="vdm-label">TOTAL</span>
                        <span className="vdm-value total-text">₹ {record.total}</span>
                      </div>

                      <div className="vdm-actions">
                        <button className="vdm-action-btn edit-btn" title="Edit" onClick={() => handleOpenEdit(record)}>
                          <FiEdit />
                        </button>
                        <button className="vdm-action-btn refresh-btn" title="Reset/Refresh Installments" onClick={() => handleResetRecord(record.id)}>
                          <FiRefreshCcw />
                        </button>
                        <button className="vdm-action-btn delete-btn" title="Delete" onClick={() => handleDeleteRecord(record.id)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {!showForm && (
            <div className="vdm-history-section">
              <h3 className="vdm-history-title">Insurance History Guidelines</h3>
              <div className="vdm-history-placeholder" style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '1rem', height: 'auto', borderStyle: 'solid' }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-main)' }}>Policy Information Tracking</p>
                <p style={{ margin: 0, fontSize: '0.8rem', textAlign: 'center' }}>
                  Use this console to track individual installment payment dates and record historical policy schedules. 
                  Admins can edit values, reset payment dates back to pending, or remove records from auditing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsModal;
