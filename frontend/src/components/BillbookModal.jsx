import React, { useContext, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { FiX, FiSearch, FiDownload, FiFilter, FiCalendar, FiTrash2 } from "react-icons/fi";
import { VehicleContext } from "../context/VehicleContext";
import PaymentModal from "./PaymentModal";
import "./BillbookModal.css";

const BillbookModal = ({ onClose }) => {
  const { vehicles } = useContext(VehicleContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [allVehicles, setAllVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  const [expandedYears, setExpandedYears] = useState({});
  const [showYearModal, setShowYearModal] = useState(null);
  const [paymentVehicle, setPaymentVehicle] = useState(null);
  const [historyDataMap, setHistoryDataMap] = useState({});

  const containerRef = useRef(null);

  useEffect(() => {
    // Lock trackpad two-finger swipe back/forward globally while mounted
    const originalStyle = document.body.style.overscrollBehaviorX;
    document.body.style.overscrollBehaviorX = "none";
    return () => {
      document.body.style.overscrollBehaviorX = originalStyle;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // If the scroll gesture is horizontal
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        container.scrollLeft += e.deltaX;
        e.preventDefault();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    const fetchBulk = async () => {
      try {
        const res = await axios.get("/api/payments/bulk", {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setHistoryDataMap(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBulk();
  }, [vehicles, paymentVehicle]);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await axios.get("/api/vehicles?all=true", {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAllVehicles(res.data);
      } catch (err) {
        console.error("Failed to fetch vehicles for billbook", err);
      }
    };
    fetchVehicles();
  }, [vehicles, paymentVehicle]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axios.get("/api/admin/clients", {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setClients(res.data);
      } catch (err) {
        console.error("Failed to fetch clients for billbook filter", err);
      }
    };
    fetchClients();
  }, []);

  const syncToDB = async (vId, data) => {
    try {
      await axios.post(`/api/payments/${vId}`, { historyData: data }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d)) return "-";
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const getInsuranceColor = (status) => {
    if (status === 'interested') return "var(--ins-wants)"; // green
    if (status === 'done') return "var(--ins-done)"; // blue
    if (status === 'not_interested') return "var(--ins-no)"; // red
    return "transparent";
  };

  const getSet = (vId, docKey, suffix = '') => {
    const h = historyDataMap[vId]?.[docKey] || [];
    if (suffix === '') return h[0] || null;
    const yearMatch = h.find(s => {
      const d = s.installments[0]?.date || '';
      return d.startsWith(suffix.replace('_', ''));
    });
    return yearMatch || null;
  };

  const handlePaymentEdit = (vId, docKeyAbbr, suffix, field, value) => {
    setHistoryDataMap(prev => {
      const clone = structuredClone(prev);
      if (!clone[vId]) clone[vId] = { fitness: [], tax: [], puc: [], permit: [], nationalPermit: [], insurance: [] };
      
      const docKey = docKeyMap[docKeyAbbr];
      if (!clone[vId][docKey]) clone[vId][docKey] = [];
      
      let targetSet = null;
      let setIndex = -1;

      if (suffix === '') {
        targetSet = clone[vId][docKey][0];
        setIndex = 0;
      } else {
        const year = suffix.replace('_', '');
        setIndex = clone[vId][docKey].findIndex(s => (s.installments[0]?.date || '').startsWith(year));
        if (setIndex !== -1) targetSet = clone[vId][docKey][setIndex];
      }

      if (!targetSet) {
        targetSet = { id: Date.now(), total: 0, installments: [
          { date: '', amount: 0 },
          { date: '', amount: 0 },
          { date: '', amount: 0 },
          { date: '', amount: 0 },
        ] };
        if (suffix === '') {
          clone[vId][docKey].unshift(targetSet);
        } else {
          clone[vId][docKey].push(targetSet);
        }
      }

      while (targetSet.installments.length < 4) {
        targetSet.installments.push({ date: '', amount: 0 });
      }

      if (field === 'P') {
        targetSet.total = parseFloat(value) || 0;
      } else if (field.startsWith('I')) {
        const idx = parseInt(field.charAt(1)) - 1;
        targetSet.installments[idx].amount = parseFloat(value) || 0;
      }

      syncToDB(vId, clone[vId]);
      return clone;
    });
  };

  const handleDateEdit = (vId, docKeyAbbr, suffix, idx, dateVal) => {
    setHistoryDataMap(prev => {
      const clone = structuredClone(prev);
      const docKey = docKeyMap[docKeyAbbr];
      
      let targetSet = null;
      if (suffix === '') {
        targetSet = clone[vId][docKey][0];
      } else {
        const year = suffix.replace('_', '');
        const setIndex = clone[vId][docKey].findIndex(s => (s.installments[0]?.date || '').startsWith(year));
        if (setIndex !== -1) targetSet = clone[vId][docKey][setIndex];
      }

      if (targetSet && targetSet.installments[idx]) {
        targetSet.installments[idx].date = dateVal;
        syncToDB(vId, clone[vId]);
      }
      return clone;
    });
  };

  const handleResetVehicleRow = (vId) => {
    if (window.confirm("Are you sure you want to completely reset and clear all payments for this vehicle?")) {
      setHistoryDataMap(prev => {
        const clone = { ...prev };
        clone[vId] = {};
        syncToDB(vId, {});
        return clone;
      });
    }
  };

  const docKeyMap = {
    'fit': 'fitness',
    'tax': 'tax',
    'puc': 'puc',
    'per': 'permit',
    'np': 'nationalPermit',
    'ins': 'insurance'
  };

  const calculateTotalDue = (vId, suffix = '') => {
    const fields = ['fitness', 'tax', 'puc', 'permit', 'nationalPermit', 'insurance'];
    let totalDue = 0;
    fields.forEach(docKey => {
      const set = getSet(vId, docKey, suffix);
      if (set) {
        let paidSum = 0;
        set.installments.forEach(i => {
          if (i.date) paidSum += i.amount;
        });
        totalDue += (set.total - paidSum);
      }
    });
    return totalDue;
  };

  const calculateTotalReceived = (vId, suffix = '') => {
    const fields = ['fitness', 'tax', 'puc', 'permit', 'nationalPermit', 'insurance'];
    let totalReceived = 0;
    fields.forEach(docKey => {
      const set = getSet(vId, docKey, suffix);
      if (set) {
        set.installments.forEach(i => {
          if (i.date) totalReceived += i.amount;
        });
      }
    });
    return totalReceived;
  };

  const calculateGrandTotalReceived = (vId) => {
    const vHistory = historyDataMap[vId];
    if (!vHistory) return 0;
    
    let grandTotal = 0;
    Object.values(vHistory).forEach(setsArray => {
      if (Array.isArray(setsArray)) {
        setsArray.forEach(set => {
          if (set && Array.isArray(set.installments)) {
            set.installments.forEach(inst => {
              if (inst && inst.date) {
                grandTotal += (inst.amount || 0);
              }
            });
          }
        });
      }
    });
    return grandTotal;
  };

  const filteredVehicles = allVehicles.filter(v => {
    let matchSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchSearch = 
        (v.vehicleNumber && v.vehicleNumber.toLowerCase().includes(q)) ||
        (v.fullName && v.fullName.toLowerCase().includes(q)) ||
        (v.mobileNumber && v.mobileNumber.toLowerCase().includes(q)) ||
        (v.vehicleClass && v.vehicleClass.toLowerCase().includes(q));
    }
    
    let matchFilter = true;
    if (filterMode === "due") {
      matchFilter = calculateTotalDue(v._id) > 0;
    } else if (filterMode === "nodue") {
      matchFilter = calculateTotalDue(v._id) <= 0;
    } else if (filterMode === "expired") {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const checkField = (d) => d && new Date(d) > new Date(0) && new Date(d) <= endOfToday;
      matchFilter = checkField(v.fitnessExpiry) ||
                    checkField(v.taxExpiry) ||
                    checkField(v.pucExpiry) ||
                    checkField(v.permitExpiry) ||
                    checkField(v.nationalPermitExpiry) ||
                    checkField(v.insuranceExpiry);
    } else if (filterMode === "reassign") {
      if (!v.assignedTo || !v.assignedDate) {
        matchFilter = false;
      } else {
        const fortyFiveDaysAgo = new Date();
        fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
        const hasExpiredDoc = (() => {
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          const checkField = (d) => d && new Date(d) > new Date(0) && new Date(d) <= endOfToday;
          return checkField(v.fitnessExpiry) ||
                 checkField(v.taxExpiry) ||
                 checkField(v.pucExpiry) ||
                 checkField(v.permitExpiry) ||
                 checkField(v.nationalPermitExpiry) ||
                 checkField(v.insuranceExpiry);
        })();
        matchFilter = new Date(v.assignedDate) < fortyFiveDaysAgo && hasExpiredDoc;
      }
    }

    let matchClient = true;
    if (selectedClient !== "all") {
      matchClient = v.assignedTo === selectedClient;
    }

    let matchDate = true;
    if (selectedDate) {
      const formattedAssigned = v.assignedDate ? new Date(v.assignedDate).toISOString().split("T")[0] : "";
      matchDate = formattedAssigned === selectedDate;
    }

    return matchSearch && matchFilter && matchClient && matchDate;
  });

  const getCSVValue = (vId, docKey, suffix, fieldType, idx = 0) => {
    const set = getSet(vId, docKeyMap[docKey], suffix);
    if (!set) return "-";
    if (fieldType === 'P') return set.total;
    const inst = set.installments[idx];
    if (!inst) return "-";
    return inst.date ? inst.amount : `${inst.amount} (Pending)`;
  };

  const exportToCSV = () => {
    const headers = [
      "Vehicle No", "Owner Name", "Class", "Mobile",
      "Fit Exp", "Fit Pymt", "Fit I1", "Fit I2", "Fit I3", "Fit I4",
      "Tax Exp", "Tax Pymt", "Tax I1", "Tax I2", "Tax I3", "Tax I4",
      "PUC Exp", "PUC Pymt", "PUC I1", "PUC I2", "PUC I3", "PUC I4",
      "Per Exp", "Per Pymt", "Per I1", "Per I2", "Per I3", "Per I4",
      "NP Exp", "NP Pymt", "NP I1", "NP I2", "NP I3", "NP I4",
      "Ins Exp", "Ins Pymt", "Ins I1", "Ins I2", "Ins I3", "Ins I4",
      "Total Receivable", "Total Received", "Grand Received"
    ];

    const rows = [headers.join(",")];

    filteredVehicles.forEach(v => {
      const row = [
        v.vehicleNumber, v.fullName || "-", v.vehicleClass || "-", v.mobileNumber || "-",
        formatDate(v.fitnessExpiry), getCSVValue(v._id, 'fit', '', 'P'), getCSVValue(v._id, 'fit', '', 'I', 0), getCSVValue(v._id, 'fit', '', 'I', 1), getCSVValue(v._id, 'fit', '', 'I', 2), getCSVValue(v._id, 'fit', '', 'I', 3),
        formatDate(v.taxExpiry), getCSVValue(v._id, 'tax', '', 'P'), getCSVValue(v._id, 'tax', '', 'I', 0), getCSVValue(v._id, 'tax', '', 'I', 1), getCSVValue(v._id, 'tax', '', 'I', 2), getCSVValue(v._id, 'tax', '', 'I', 3),
        formatDate(v.pucExpiry), getCSVValue(v._id, 'puc', '', 'P'), getCSVValue(v._id, 'puc', '', 'I', 0), getCSVValue(v._id, 'puc', '', 'I', 1), getCSVValue(v._id, 'puc', '', 'I', 2), getCSVValue(v._id, 'puc', '', 'I', 3),
        formatDate(v.permitExpiry), getCSVValue(v._id, 'per', '', 'P'), getCSVValue(v._id, 'per', '', 'I', 0), getCSVValue(v._id, 'per', '', 'I', 1), getCSVValue(v._id, 'per', '', 'I', 2), getCSVValue(v._id, 'per', '', 'I', 3),
        formatDate(v.nationalPermitExpiry), getCSVValue(v._id, 'np', '', 'P'), getCSVValue(v._id, 'np', '', 'I', 0), getCSVValue(v._id, 'np', '', 'I', 1), getCSVValue(v._id, 'np', '', 'I', 2), getCSVValue(v._id, 'np', '', 'I', 3),
        formatDate(v.insuranceExpiry), getCSVValue(v._id, 'ins', '', 'P'), getCSVValue(v._id, 'ins', '', 'I', 0), getCSVValue(v._id, 'ins', '', 'I', 1), getCSVValue(v._id, 'ins', '', 'I', 2), getCSVValue(v._id, 'ins', '', 'I', 3),
        calculateTotalDue(v._id),
        calculateTotalReceived(v._id),
        calculateGrandTotalReceived(v._id)
      ];
      rows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));

      const pastYears = expandedYears[v._id] || [];
      pastYears.forEach(year => {
        const s = `_${year}`;
        const pRow = [
          `${v.vehicleNumber} (${year})`, v.fullName || "-", v.vehicleClass || "-", v.mobileNumber || "-",
          `Past ${year}`, getCSVValue(v._id, 'fit', s, 'P'), getCSVValue(v._id, 'fit', s, 'I', 0), getCSVValue(v._id, 'fit', s, 'I', 1), getCSVValue(v._id, 'fit', s, 'I', 2), getCSVValue(v._id, 'fit', s, 'I', 3),
          `Past ${year}`, getCSVValue(v._id, 'tax', s, 'P'), getCSVValue(v._id, 'tax', s, 'I', 0), getCSVValue(v._id, 'tax', s, 'I', 1), getCSVValue(v._id, 'tax', s, 'I', 2), getCSVValue(v._id, 'tax', s, 'I', 3),
          `Past ${year}`, getCSVValue(v._id, 'puc', s, 'P'), getCSVValue(v._id, 'puc', s, 'I', 0), getCSVValue(v._id, 'puc', s, 'I', 1), getCSVValue(v._id, 'puc', s, 'I', 2), getCSVValue(v._id, 'puc', s, 'I', 3),
          `Past ${year}`, getCSVValue(v._id, 'per', s, 'P'), getCSVValue(v._id, 'per', s, 'I', 0), getCSVValue(v._id, 'per', s, 'I', 1), getCSVValue(v._id, 'per', s, 'I', 2), getCSVValue(v._id, 'per', s, 'I', 3),
          `Past ${year}`, getCSVValue(v._id, 'np', s, 'P'), getCSVValue(v._id, 'np', s, 'I', 0), getCSVValue(v._id, 'np', s, 'I', 1), getCSVValue(v._id, 'np', s, 'I', 2), getCSVValue(v._id, 'np', s, 'I', 3),
          `Past ${year}`, getCSVValue(v._id, 'ins', s, 'P'), getCSVValue(v._id, 'ins', s, 'I', 0), getCSVValue(v._id, 'ins', s, 'I', 1), getCSVValue(v._id, 'ins', s, 'I', 2), getCSVValue(v._id, 'ins', s, 'I', 3),
          pastTotalDue,
          calculateTotalReceived(v._id, s),
          "-"
        ];
        rows.push(pRow.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "billbook_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleYearToggle = (vId, year) => {
    setExpandedYears(prev => {
      const current = prev[vId] || [];
      if (current.includes(year)) {
        return { ...prev, [vId]: current.filter(y => y !== year) };
      } else {
        return { ...prev, [vId]: [...current, year].sort((a,b) => b-a) };
      }
    });
  };

  const renderPaymentCells = (vId, docKeyAbbr, suffix = '', bgStyle = {}) => {
    const docKey = docKeyMap[docKeyAbbr];
    const set = getSet(vId, docKey, suffix);
    
    const total = set ? set.total : '';
    const insts = set ? set.installments : [];
    
    const renderInst = (idx) => {
      const inst = insts[idx];
      const isPaid = inst ? !!inst.date : false;
      const amount = inst ? (inst.amount || '') : '';
      
      const cellBg = isPaid ? '#e8f8f5' : '#f4f6f6'; 
      const textColor = isPaid ? '#27ae60' : '#95a5a6';
      
      const finalBg = bgStyle.backgroundColor && bgStyle.backgroundColor !== 'transparent' ? bgStyle.backgroundColor : cellBg;
      const finalColor = bgStyle.color && bgStyle.color !== 'inherit' ? bgStyle.color : textColor;

      const displayDate = isPaid ? inst.date.split('-').reverse().slice(0,2).join('/') : <FiCalendar style={{ fontSize: '0.8rem', marginTop: '1px' }} />;

      return (
        <td style={{ backgroundColor: finalBg, padding: '2px', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <input 
              type="number" 
              placeholder="₹0" 
              value={amount}
              onChange={(e) => handlePaymentEdit(vId, docKeyAbbr, suffix, `I${idx + 1}`, e.target.value)}
              style={{ 
                backgroundColor: 'transparent', 
                color: finalColor, 
                fontWeight: 'bold',
                width: '40px', 
                border: 'none', 
                textAlign: 'center',
                outline: 'none',
                padding: 0,
                fontSize: '0.75rem'
              }}
              title={isPaid ? `Paid on ${inst.date}` : 'Pending'}
            />
            {amount > 0 && (
              <div style={{ position: 'relative', width: '100%', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <span style={{ fontSize: '0.55rem', color: isPaid ? '#27ae60' : '#e67e22', fontWeight: 'bold' }}>
                    {displayDate}
                  </span>
                  <input 
                    type="date"
                    value={inst.date || ''}
                    onChange={(e) => handleDateEdit(vId, docKeyAbbr, suffix, idx, e.target.value)}
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      width: '100%',
                      height: '100%',
                      zIndex: 1
                    }}
                    title="Select Date"
                  />
                </div>
                {isPaid && (
                  <button 
                    onClick={() => handleDateEdit(vId, docKeyAbbr, suffix, idx, "")}
                    style={{ background: 'none', border: 'none', color: '#e74c3c', padding: 0, cursor: 'pointer', zIndex: 10, marginLeft: '4px', display: 'flex', alignItems: 'center' }}
                    title="Reset Date to Pending"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      );
    };

    return (
      <>
        <td style={{ ...bgStyle, padding: '2px', verticalAlign: 'middle' }}>
          <input 
            type="number" 
            placeholder="₹0" 
            value={total || ''}
            onChange={(e) => handlePaymentEdit(vId, docKeyAbbr, suffix, 'P', e.target.value)}
            style={{
              backgroundColor: 'transparent',
              color: '#2c3e50',
              fontWeight: 'bold',
              width: '45px',
              border: 'none',
              textAlign: 'center',
              outline: 'none',
              padding: 0,
              fontSize: '0.75rem'
            }}
          />
        </td>
        {renderInst(0)}
        {renderInst(1)}
        {renderInst(2)}
        {renderInst(3)}
      </>
    );
  };

  const modalContent = (
    <div className="bb-modal-overlay">
      <div className="bb-modal-content">
        
        <div className="bb-modal-header bb-navbar">
          <h2>BILLBOOK</h2>
          
          <div className="bb-nav-controls">
            <div className="bb-search-box">
              <FiSearch className="bb-search-icon" />
              <input 
                type="text" 
                placeholder="Search billbook..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="bb-filter-box">
              <FiFilter className="bb-filter-icon" />
              <select value={filterMode} onChange={e => setFilterMode(e.target.value)}>
                <option value="all">Full Database</option>
                <option value="due">Pending Dues</option>
                <option value="nodue">No Dues (Fully Paid)</option>
                <option value="expired">Expired / Expiring Today</option>
                <option value="reassign">Reassign Pending</option>
              </select>
            </div>

            <div className="bb-filter-box">
              <FiFilter className="bb-filter-icon" />
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                <option value="all">All Clients</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="bb-filter-box">
              <FiCalendar className="bb-filter-icon" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
                style={{ 
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              />
              {selectedDate && (
                <button 
                  onClick={() => setSelectedDate("")} 
                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', marginLeft: '0.5rem', display: 'flex', alignItems: 'center' }}
                  title="Clear Date"
                >
                  <FiX />
                </button>
              )}
            </div>

            <button className="bb-action-btn bb-export-btn" onClick={exportToCSV}>
              <FiDownload /> Export CSV
            </button>
          </div>

          <button className="bb-close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="bb-table-container" ref={containerRef}>
          <table className="bb-excel-table">
            <thead>
              <tr>
                <th rowSpan="2" className="sticky-col-1 bb-main-th">Vehicle No</th>
                <th rowSpan="2" className="sticky-col-2 bb-main-th">Owner Name</th>
                <th rowSpan="2" className="sticky-col-3 bb-main-th">Class</th>
                <th rowSpan="2" className="sticky-col-4 bb-main-th">Mobile</th>
                <th colSpan="6" className="bb-doc-group bb-main-th">Fitness</th>
                <th colSpan="6" className="bb-doc-group bb-main-th">Tax</th>
                <th colSpan="6" className="bb-doc-group bb-main-th">PUC</th>
                <th colSpan="6" className="bb-doc-group bb-main-th">Permit</th>
                <th colSpan="6" className="bb-doc-group bb-main-th">Nat. Permit</th>
                <th colSpan="6" className="bb-doc-group bb-ins-group bb-main-th">Insurance</th>
                <th rowSpan="2" className="bb-total-col bb-main-th">Total Receivable</th>
                <th rowSpan="2" className="bb-total-col bb-main-th">Total Received</th>
                <th rowSpan="2" className="bb-total-col bb-main-th">Grand Received</th>
              </tr>
              <tr>
                {['fit', 'tax', 'puc', 'per', 'np', 'ins'].map(key => (
                  <React.Fragment key={key}>
                    <th className={`bb-sub-th ${key === 'ins' ? 'bb-ins-group' : ''}`}>Exp</th>
                    <th className={`bb-sub-th ${key === 'ins' ? 'bb-ins-group' : ''}`}>Tot</th>
                    <th className={`bb-sub-th ${key === 'ins' ? 'bb-ins-group' : ''}`}>I1</th>
                    <th className={`bb-sub-th ${key === 'ins' ? 'bb-ins-group' : ''}`}>I2</th>
                    <th className={`bb-sub-th ${key === 'ins' ? 'bb-ins-group' : ''}`}>I3</th>
                    <th className={`bb-sub-th ${key === 'ins' ? 'bb-ins-group' : ''}`}>I4</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map(v => {
                const insStatus = v.verificationStatus?.insuranceExpiry?.status;
                const insColor = getInsuranceColor(insStatus);
                const insStyle = { backgroundColor: insColor, color: insColor !== 'transparent' ? '#fff' : 'inherit' };
                const pastYears = expandedYears[v._id] || [];
                const totalDue = calculateTotalDue(v._id);
                const totalReceived = calculateTotalReceived(v._id);

                return (
                  <React.Fragment key={v._id}>
                    <tr>
                      <td className="sticky-col-1 bb-fw-bold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="bb-clickable-plate" onClick={() => setShowYearModal(v)} title="Click to view/edit past payments">
                          {v.vehicleNumber}
                        </span>
                        <button 
                          onClick={() => handleResetVehicleRow(v._id)} 
                          style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: 0 }}
                          title="Reset Vehicle Payments"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </td>
                      <td className="sticky-col-2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.fullName}>{v.fullName || "-"}</td>
                      <td className="sticky-col-3" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.vehicleClass}>{v.vehicleClass || "-"}</td>
                      <td className="sticky-col-4">{v.mobileNumber || "-"}</td>
                      
                      <td className="bb-date-cell">{formatDate(v.fitnessExpiry)}</td>
                      {renderPaymentCells(v._id, 'fit')}

                      <td className="bb-date-cell">{formatDate(v.taxExpiry)}</td>
                      {renderPaymentCells(v._id, 'tax')}

                      <td className="bb-date-cell">{formatDate(v.pucExpiry)}</td>
                      {renderPaymentCells(v._id, 'puc')}

                      <td className="bb-date-cell">{formatDate(v.permitExpiry)}</td>
                      {renderPaymentCells(v._id, 'per')}

                      <td className="bb-date-cell">{formatDate(v.nationalPermitExpiry)}</td>
                      {renderPaymentCells(v._id, 'np')}

                      <td className="bb-date-cell bb-ins-group" style={insStyle}>
                        {formatDate(v.insuranceExpiry)}
                      </td>
                      {renderPaymentCells(v._id, 'ins', '', insStyle)}

                      <td className={`bb-total-val bb-fw-bold ${totalDue > 0 ? 'has-dues' : ''}`}>
                        ₹{totalDue}
                      </td>
                      <td className="bb-total-val bb-fw-bold" style={{ color: '#27ae60' }}>
                        ₹{totalReceived}
                      </td>
                      <td className="bb-total-val bb-fw-bold" style={{ color: '#8e44ad' }}>
                        ₹{calculateGrandTotalReceived(v._id)}
                      </td>
                    </tr>

                    {pastYears.map(year => {
                      const suffix = `_${year}`;
                      const pastTotalDue = calculateTotalDue(v._id, suffix);
                      return (
                        <tr key={`${v._id}_${year}`} className="bb-past-row">
                          <td className="sticky-col-1 bb-past-plate">↳ {year}</td>
                          <td className="sticky-col-2 bb-past-info" style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>Past Records for {year}</td>
                          <td className="sticky-col-3 bb-past-info"></td>
                          <td className="sticky-col-4 bb-past-info"></td>
                          
                          <td className="bb-date-cell bb-past-cell">Past {year}</td>
                          {renderPaymentCells(v._id, 'fit', suffix)}

                          <td className="bb-date-cell bb-past-cell">Past {year}</td>
                          {renderPaymentCells(v._id, 'tax', suffix)}

                          <td className="bb-date-cell bb-past-cell">Past {year}</td>
                          {renderPaymentCells(v._id, 'puc', suffix)}

                          <td className="bb-date-cell bb-past-cell">Past {year}</td>
                          {renderPaymentCells(v._id, 'per', suffix)}

                          <td className="bb-date-cell bb-past-cell">Past {year}</td>
                          {renderPaymentCells(v._id, 'np', suffix)}

                          <td className="bb-date-cell bb-ins-group bb-past-cell">Past {year}</td>
                          {renderPaymentCells(v._id, 'ins', suffix)}

                          <td className={`bb-total-val bb-fw-bold ${pastTotalDue > 0 ? 'has-dues' : ''}`}>
                            ₹{pastTotalDue}
                          </td>
                          <td className="bb-total-val bb-fw-bold" style={{ color: '#27ae60' }}>
                            ₹{calculateTotalReceived(v._id, suffix)}
                          </td>
                          <td className="bb-total-val bb-fw-bold" style={{ color: '#8e44ad' }}>
                            -
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showYearModal && (
        <div className="bb-year-modal-overlay">
          <div className="bb-year-modal">
            <div className="bb-year-modal-header">
              <h3>Past Records for {showYearModal.vehicleNumber}</h3>
              <button onClick={() => setShowYearModal(null)}><FiX /></button>
            </div>
            <div className="bb-year-modal-body">
              <p>Select years to view or edit past payments:</p>
              <div className="bb-year-grid">
                {['2025', '2024', '2023', '2022', '2021', '2020'].map(year => {
                  const isSelected = (expandedYears[showYearModal._id] || []).includes(year);
                  return (
                    <label key={year} className="bb-year-label">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleYearToggle(showYearModal._id, year)}
                      />
                      {year}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="bb-year-modal-footer">
              <button onClick={() => setShowYearModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
      
      {paymentVehicle && (
        <PaymentModal 
          vehicleDetails={paymentVehicle} 
          onClose={() => setPaymentVehicle(null)} 
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BillbookModal;
