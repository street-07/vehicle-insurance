import React, { useContext, useState } from "react";
import { VehicleContext } from "../context/VehicleContext";
import { AuthContext } from "../context/AuthContext";
import { FiSearch, FiLogOut, FiBell, FiCheck, FiX, FiPlus, FiTrash2, FiRefreshCcw, FiActivity } from "react-icons/fi";
import AddNewModal from "./AddNewModal";
import ExcelUploadModal from "./ExcelUploadModal";
import ManageClientsModal from "./ManageClientsModal";
import InsuranceModal from "./InsuranceModal";
import BillbookModal from "./BillbookModal";
import "./Navbar.css";

const Navbar = () => {
  const { search, fetchVehicles, filter, vehicles, showAll, searchQuery } = useContext(VehicleContext);
  const { user, logout } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterField, setFilterField] = useState("assignedDate");
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split("T")[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManageClients, setShowManageClients] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [showBillbookModal, setShowBillbookModal] = useState(false);
  const [viewingDeletionReq, setViewingDeletionReq] = useState(null);
  
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [recycleBinLogs, setRecycleBinLogs] = useState([]);
  const [selectedRecycleLogs, setSelectedRecycleLogs] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const [remainingTokens, setRemainingTokens] = useState(100);
  const [showRefillForm, setShowRefillForm] = useState(false);
  const [refillAmount, setRefillAmount] = useState("");

  const fetchTokens = async () => {
    try {
      const res = await fetch("/api/admin/tokens", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRemainingTokens(data.remainingTokens);
      }
    } catch (err) {
      console.error("Failed to fetch API tokens", err);
    }
  };

  const handleRefillSubmit = async () => {
    const amount = parseInt(refillAmount);
    if (!refillAmount || isNaN(amount) || amount <= 0) {
      return alert("Please enter a valid number of tokens.");
    }
    try {
      const res = await fetch("/api/admin/tokens/refill", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ count: amount })
      });
      const data = await res.json();
      if (res.ok) {
        setRemainingTokens(data.remainingTokens);
        setRefillAmount("");
        setShowRefillForm(false);
        alert(`Successfully synced! Loaded ${amount} verification tokens.`);
      } else {
        alert(data.message || "Failed to sync tokens.");
      }
    } catch (err) {
      alert("Failed to sync tokens balance");
    }
  };

  const handleBulkApiRefresh = async () => {
    if (window.confirm("Are you sure you want to refresh all vehicle records? This will fetch the latest document expiry dates from Attestr and consume 1 API token per vehicle.")) {
      try {
        alert("Bulk refresh started in the background. Please wait...");
        const res = await fetch("/api/vehicles/bulk-refresh-api", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        const data = await res.json();
        alert(data.message);
        fetchVehicles();
        fetchTokens();
      } catch (err) {
        console.error(err);
        alert("Failed to run bulk database refresh.");
      }
    }
  };

  React.useEffect(() => {
    if (user?.role === "admin") {
      const fetchAdminData = async () => {
        try {
          const delRes = await fetch("/api/admin/deletions", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          });
          const delData = await delRes.json();
          if (delRes.ok) setDeletionRequests(delData);

          const binRes = await fetch("/api/admin/recycle-bin", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          });
          const binData = await binRes.json();
          if (binRes.ok) setRecycleBinLogs(binData);

          fetchTokens();
        } catch (err) { }
      };
      fetchAdminData();
    }
  }, [user, vehicles]);

  const handleResolveDeletion = async (id, action) => {
    try {
      await fetch(`/api/admin/deletions/${id}/resolve`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action })
      });
      window.location.reload();
    } catch (err) {}
  };

  const handleRestoreVehicle = async (logId) => {
    try {
      const res = await fetch(`/api/admin/recycle-bin/${logId}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      alert(data.message);
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {}
  };

  const handleSelectAllRecycle = (e) => {
    if (e.target.checked) {
      setSelectedRecycleLogs(recycleBinLogs.map(l => l._id));
    } else {
      setSelectedRecycleLogs([]);
    }
  };

  const toggleRecycleSelect = (id) => {
    if (selectedRecycleLogs.includes(id)) {
      setSelectedRecycleLogs(selectedRecycleLogs.filter(l => l !== id));
    } else {
      setSelectedRecycleLogs([...selectedRecycleLogs, id]);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedRecycleLogs.length === 0) return;
    if (!window.confirm(`Are you sure you want to restore ${selectedRecycleLogs.length} vehicles?`)) return;

    try {
      const res = await fetch(`/api/admin/recycle-bin/bulk-restore`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ logIds: selectedRecycleLogs })
      });
      const data = await res.json();
      alert(data.message);
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {}
  };

  const handlePermanentDelete = async () => {
    if (selectedRecycleLogs.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedRecycleLogs.length} vehicles? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/recycle-bin/permanent-delete`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ logIds: selectedRecycleLogs })
      });
      const data = await res.json();
      alert(data.message);
      if (res.ok) {
        setRecycleBinLogs(recycleBinLogs.filter(l => !selectedRecycleLogs.includes(l._id)));
        setSelectedRecycleLogs([]);
      }
    } catch (err) {}
  };

  const handleSearch = (e) => {
    e.preventDefault();
    search(query);
  };

  const handleFilter = (e) => {
    e.preventDefault();
    filter(filterField, filterValue);
    setShowFilter(false);
  };

  const handleExport = () => {
    let exportVehicles = [...vehicles];

    // Filter by search query if currently active
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      exportVehicles = exportVehicles.filter(v => 
        (v.vehicleNumber && v.vehicleNumber.toLowerCase().includes(q)) || 
        (v.mobileNumber && v.mobileNumber.toLowerCase().includes(q)) ||
        (v.fullName && v.fullName.toLowerCase().includes(q)) ||
        (v.vehicleClass && v.vehicleClass.toLowerCase().includes(q))
      );
    }

    if (exportVehicles.length === 0) {
      alert("No data to export for the active tab/filters");
      return;
    }

    const headers = [
      "Vehicle Number", 
      "Full Name", 
      "Full Name Verified",
      "Vehicle Class", 
      "Vehicle Class Verified",
      "Number", 
      "Number Verified",
      "Fitness Expiry", 
      "Fitness Verified",
      "Fitness Calls",
      "Tax Expiry", 
      "Tax Verified",
      "Tax Calls",
      "PUC Expiry", 
      "PUC Verified",
      "PUC Calls",
      "Permit Expiry", 
      "Permit Verified",
      "Permit Calls",
      "National Permit Expiry", 
      "National Permit Verified",
      "National Permit Calls",
      "Insurance Expiry",
      "Insurance Verified",
      "Insurance Calls"
    ];
    const csvRows = [headers.join(",")];

    exportVehicles.forEach(v => {
      const getStatus = (field) => {
        const vStatus = v.verificationStatus?.[field];
        if (!vStatus) return "Untested";
        if (vStatus.status === "right") return "Valid";
        if (vStatus.status === "wrong") return "Invalid";
        return "Untested";
      };

      const getCalls = (field) => {
        const vStatus = v.verificationStatus?.[field];
        if (!vStatus || typeof vStatus.calls !== 'number') return "0";
        return String(vStatus.calls);
      };

      const row = [
        v.vehicleNumber || "",
        v.fullName || "",
        getStatus("fullName"),
        v.vehicleClass || "",
        getStatus("vehicleClass"),
        v.mobileNumber || "",
        getStatus("mobileNumber"),
        v.fitnessExpiry ? new Date(v.fitnessExpiry).toLocaleDateString() : "",
        getStatus("fitnessExpiry"),
        getCalls("fitnessExpiry"),
        v.taxExpiry ? new Date(v.taxExpiry).toLocaleDateString() : "",
        getStatus("taxExpiry"),
        getCalls("taxExpiry"),
        v.pucExpiry ? new Date(v.pucExpiry).toLocaleDateString() : "",
        getStatus("pucExpiry"),
        getCalls("pucExpiry"),
        v.permitExpiry ? new Date(v.permitExpiry).toLocaleDateString() : "",
        getStatus("permitExpiry"),
        getCalls("permitExpiry"),
        v.nationalPermitExpiry ? new Date(v.nationalPermitExpiry).toLocaleDateString() : "",
        getStatus("nationalPermitExpiry"),
        getCalls("nationalPermitExpiry"),
        v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : "",
        getStatus("insuranceExpiry"),
        getCalls("insuranceExpiry"),
      ];
      const escapedRow = row.map(val => `"${String(val).replace(/"/g, '""')}"`);
      csvRows.push(escapedRow.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // Set filename based on active tab view
    let filename = "full_database_vehicles.csv";
    if (showAll === "false") {
      filename = "expired_expiring_today_vehicles.csv";
    } else if (showAll === "reassign") {
      filename = "reassign_pending_vehicles.csv";
    }
    
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <nav className="navbar">
      <div className="navbar-left">
        <h1 className="logo">
          <span className="logo-top">FAST</span>
          <span className="logo-bottom">PAPER</span>
        </h1>
      </div>
      
      <div className="navbar-center">
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            placeholder="Search vehicle no, mobile, name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="search-btn"><FiSearch /></button>
        </form>
      </div>

      <div className="navbar-right">
        {user && user.role === "admin" && (
          <>
            <div className="filter-wrapper" style={{ position: 'relative' }}>
              <button className="nav-btn outline" onClick={() => { setShowFilter(!showFilter); setShowNotifications(false); setShowAdminMenu(false); setShowRefillForm(false); }}>Filter</button>
              {showFilter && (
                <div className="filter-panel" style={{ position: 'absolute', top: '50px', right: '0', zIndex: 100 }}>
                  <form onSubmit={handleFilter}>
                    <select value={filterField} onChange={(e) => {
                      setFilterField(e.target.value);
                      if (e.target.value === "assignedDate") {
                        setFilterValue(new Date().toISOString().split("T")[0]);
                      } else {
                        setFilterValue("");
                      }
                    }}>
                      <option value="assignedDate">Filter by Date</option>
                      <option value="newly_added">Newly Added (45 Days)</option>
                      <option value="newest">Newest Uploaded</option>
                      <option value="oldest">Oldest Uploaded</option>
                    </select>
                    {filterField === "assignedDate" ? (
                      <input 
                        type="date" 
                        value={filterValue} 
                        onChange={(e) => setFilterValue(e.target.value)} 
                        style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'inherit', color: '#333' }}
                      />
                    ) : null}
                    <button type="submit" className="apply-btn">Apply</button>
                  </form>
                </div>
              )}
            </div>

            <button className="nav-btn outline" onClick={() => setShowManageClients(true)}>Manage Clients</button>
            
            <button className="nav-btn outline" onClick={() => setShowInsuranceModal(true)}>Insurance</button>

            <button className="nav-btn outline" onClick={() => setShowBillbookModal(true)}>Billbook</button>

            <div className="token-status-wrapper" style={{ position: 'relative' }}>
              <button 
                className={`nav-btn ${showRefillForm ? 'active' : 'outline'}`} 
                onClick={() => { setShowRefillForm(!showRefillForm); setShowFilter(false); setShowNotifications(false); setShowAdminMenu(false); }}
                style={remainingTokens <= 50 ? { 
                  borderColor: '#e74c3c',
                  color: '#e74c3c'
                } : {}}
              >
                <FiActivity style={{ marginRight: '5px' }} />
                Tokens: <strong style={{ marginLeft: '3px' }}>{remainingTokens}</strong>
              </button>
              
              {showRefillForm && (
                <div className="token-refill-popover">
                  <h3>Sync Purchased Tokens</h3>
                  <p style={{ fontSize: '0.75rem', color: '#666', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                    1. Buy credit packs directly from the official portal:
                  </p>
                  <a 
                    href="https://dashboard.attestr.com/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="attestr-portal-btn"
                    style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', fontSize: '0.8rem' }}
                  >
                    Go to Attestr Billing ↗
                  </a>
                  <p style={{ fontSize: '0.75rem', color: '#666', margin: '12px 0 6px 0', lineHeight: '1.4' }}>
                    2. Once purchased, enter the quantity below to immediately update and sync the balance:
                  </p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="number" 
                      placeholder="Credits bought" 
                      value={refillAmount} 
                      onChange={e => setRefillAmount(e.target.value)} 
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: 'var(--clay-border)', background: 'var(--bg-color)', fontSize: '0.85rem', width: '90px' }}
                    />
                    <button 
                      onClick={handleRefillSubmit}
                      style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Sync
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '5px', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>
              <button 
                className="nav-btn outline" 
                onClick={() => { setShowAddModal(true); setShowAdminMenu(false); setShowNotifications(false); setShowRecycleBin(false); setShowFilter(false); setShowRefillForm(false); }} 
                title="Add New Vehicle"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', background: 'var(--primary)', color: '#fff', border: '1px solid #ffffff', boxShadow: 'var(--shadow-outer-sm)', cursor: 'pointer' }}
              >
                <FiPlus />
              </button>

              <div className="notification-wrapper" style={{ position: 'relative' }}>
                <button 
                  className="nav-btn notification-btn" 
                  onClick={() => { setShowRecycleBin(!showRecycleBin); setShowNotifications(false); setShowAdminMenu(false); setShowFilter(false); setShowRefillForm(false); }} 
                  style={{ position: 'relative', borderRadius: '50%', width: '32px', height: '32px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', background: '#e74c3c', color: '#fff', border: '1px solid #ffffff', boxShadow: 'var(--shadow-outer-sm)', cursor: 'pointer', marginRight: '5px' }}
                  title="Recycle Bin"
                >
                  <FiTrash2 />
                </button>
              </div>

              <div className="notification-wrapper" style={{ position: 'relative' }}>
                <button 
                  className="nav-btn notification-btn" 
                  onClick={() => { setShowNotifications(!showNotifications); setShowRecycleBin(false); setShowAdminMenu(false); setShowFilter(false); setShowRefillForm(false); }} 
                  style={{ position: 'relative', borderRadius: '50%', width: '32px', height: '32px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', background: 'var(--primary)', color: '#fff', border: '1px solid #ffffff', boxShadow: 'var(--shadow-outer-sm)', cursor: 'pointer' }}
                >
                  <FiBell />
                  {deletionRequests.length > 0 && (
                    <span className="bell-badge" style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', fontSize: '0.7rem', padding: '2px 6px', fontWeight: 'bold' }}>
                      {deletionRequests.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="notifications-dropdown" style={{ position: 'absolute', right: 0, top: '50px', background: 'var(--bg-color)', border: '1px solid #ffffff', boxShadow: 'var(--shadow-outer)', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '280px', zIndex: 100, maxHeight: '400px', overflowY: 'auto' }}>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Notifications</h4>
                    
                    {deletionRequests.length === 0 ? <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>No new notifications.</p> : null}

                    {deletionRequests.length > 0 && <h5 style={{ margin: '10px 0 5px 0', color: '#e74c3c' }}>Deletion Requests</h5>}
                    {deletionRequests.map(req => (
                      <div key={req._id} className="pending-client-card" style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px', border: '1px solid #ffcccc', borderRadius: '5px', background: '#fff5f5' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#c0392b' }}>{req.client?.name} requests deletion</span>
                        <span 
                          style={{ fontSize: '0.8rem', color: '#555', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => { setViewingDeletionReq(req); setShowNotifications(false); }}
                        >
                          {req.vehicles.length} Vehicles (Click to view details)
                        </span>
                        <div className="pending-actions" style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                          <button onClick={() => handleResolveDeletion(req._id, "approve")} style={{ flex: 1, background: '#2ecc71', color: 'white', border: 'none', padding: '5px', borderRadius: '3px', cursor: 'pointer' }}><FiCheck /> Approve</button>
                          <button onClick={() => handleResolveDeletion(req._id, "reject")} style={{ flex: 1, background: '#e74c3c', color: 'white', border: 'none', padding: '5px', borderRadius: '3px', cursor: 'pointer' }}><FiX /> Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="admin-menu-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div 
                  className="client-dashboard-icon" 
                  title={user?.name} 
                  onClick={() => { setShowAdminMenu(!showAdminMenu); setShowNotifications(false); setShowRecycleBin(false); setShowFilter(false); setShowRefillForm(false); }} 
                  style={{ cursor: 'pointer' }}
                >
                  <img src={`https://ui-avatars.com/api/?name=${user?.name || "User"}&background=4e82ff&color=fff`} alt="Dashboard" />
                </div>
                {showAdminMenu && (
                  <div className="admin-dropdown" style={{ position: 'absolute', right: 0, top: '50px', background: 'var(--bg-color)', border: 'var(--clay-border)', boxShadow: 'var(--shadow-outer)', borderRadius: '20px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '160px', zIndex: 100 }}>
                    <button className="nav-btn outline" onClick={() => { setShowUploadModal(true); setShowAdminMenu(false); }}>Upload</button>
                    <button className="nav-btn outline" onClick={() => { handleExport(); setShowAdminMenu(false); }}>Export</button>
                    <button className="nav-btn outline" onClick={() => { handleBulkApiRefresh(); setShowAdminMenu(false); }}>Refresh API Database</button>
                  </div>
                )}
              </div>

              <button className="nav-btn logout-btn" onClick={logout} title="Logout" style={{ borderRadius: '20px', width: '32px', height: '32px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', background: 'var(--primary)', color: '#fff', border: 'var(--clay-border)', boxShadow: 'var(--shadow-outer-sm)', cursor: 'pointer' }}>
                <FiLogOut />
              </button>
            </div>
          </>
        )}
        
        {user && user.role !== "admin" && (
          <>
            <div className="filter-wrapper" style={{ position: 'relative' }}>
              <button className="nav-btn outline" onClick={() => setShowFilter(!showFilter)}>Filter</button>
              {showFilter && (
                <div className="filter-panel" style={{ position: 'absolute', top: '50px', right: '0', zIndex: 100 }}>
                  <form onSubmit={handleFilter}>
                    <select value={filterField} onChange={(e) => setFilterField(e.target.value)}>
                      <option value="vehicleNumber">Vehicle Number</option>
                      <option value="fullName">Full Name</option>
                      <option value="vehicleClass">Vehicle Class</option>
                      <option value="mobileNumber">Number</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Value..." 
                      value={filterValue} 
                      onChange={(e) => setFilterValue(e.target.value)} 
                    />
                    <button type="submit" className="apply-btn">Apply</button>
                  </form>
                </div>
              )}
            </div>

            <button className="nav-btn outline" onClick={() => setShowInsuranceModal(true)}>Insurance</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '5px', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>
              <button 
                className="nav-btn outline" 
                onClick={() => { setShowAddModal(true); setShowFilter(false); }} 
                title="Add New Vehicle"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', background: 'var(--primary)', color: '#fff', border: '1px solid #ffffff', boxShadow: 'var(--shadow-outer-sm)', cursor: 'pointer' }}
              >
                <FiPlus />
              </button>
              <div className="client-dashboard-icon" title={user?.name}>
                <img src={`https://ui-avatars.com/api/?name=${user?.name || "User"}&background=4e82ff&color=fff`} alt="Dashboard" />
              </div>
              <button className="nav-btn logout-btn" onClick={logout} title="Logout" style={{ borderRadius: '50%', width: '32px', height: '32px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', background: 'var(--primary)', color: '#fff', border: '1px solid #ffffff', boxShadow: 'var(--shadow-outer-sm)', cursor: 'pointer' }}>
                <FiLogOut />
              </button>
            </div>
          </>
        )}
      </div>
      {showAddModal && (
        <AddNewModal 
          onClose={() => setShowAddModal(false)} 
          onSaveSuccess={() => { 
            fetchVehicles(); 
          }} 
        />
      )}
      {showUploadModal && (
        <ExcelUploadModal 
          onClose={() => setShowUploadModal(false)} 
          onSuccess={(msg) => { 
            if (msg) alert(msg);
            fetchVehicles(); 
          }} 
        />
      )}
      {showManageClients && (
        <ManageClientsModal onClose={() => setShowManageClients(false)} />
      )}
      {showInsuranceModal && (
        <InsuranceModal onClose={() => setShowInsuranceModal(false)} />
      )}
      {showBillbookModal && (
        <BillbookModal onClose={() => setShowBillbookModal(false)} />
      )}

      {viewingDeletionReq && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
              <h2>Deletion Request from: <span style={{ color: '#e74c3c' }}>{viewingDeletionReq.client?.name}</span></h2>
              <button className="close-btn" onClick={() => setViewingDeletionReq(null)}><FiX /></button>
            </div>
            
            <p style={{ marginBottom: '1.5rem', color: '#555' }}>
              This client has requested to delete the following <strong>{viewingDeletionReq.vehicles.length}</strong> vehicles.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', padding: '10px' }}>
              {viewingDeletionReq.vehiclesData?.map(v => (
                <div key={v._id} className="neu-detail-card">
                  <div className="neu-card-header">
                    <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '15px', fontFamily: '"Lastica", sans-serif', fontSize: '1rem' }}>
                      <span className="neu-badge">DETAILS</span>
                      {v.vehicleNumber}
                    </h3>
                  </div>
                  <div className="neu-grid-details">
                    <div className="neu-grid-item"><strong>Owner Name</strong> <span>{v.fullName || "N/A"}</span></div>
                    <div className="neu-grid-item"><strong>Class</strong> <span>{v.vehicleClass || "N/A"}</span></div>
                    <div className="neu-grid-item"><strong>Mobile</strong> <span>{v.mobileNumber || "N/A"}</span></div>
                    <div className="neu-grid-item"><strong>Insurance Exp</strong> <span>{v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : "N/A"}</span></div>
                    <div className="neu-grid-item"><strong>Fitness Exp</strong> <span>{v.fitnessExpiry ? new Date(v.fitnessExpiry).toLocaleDateString() : "N/A"}</span></div>
                    <div className="neu-grid-item"><strong>Tax Exp</strong> <span>{v.taxExpiry ? new Date(v.taxExpiry).toLocaleDateString() : "N/A"}</span></div>
                    <div className="neu-grid-item"><strong>PUC Exp</strong> <span>{v.pucExpiry ? new Date(v.pucExpiry).toLocaleDateString() : "N/A"}</span></div>
                    <div className="neu-grid-item"><strong>Permit Exp</strong> <span>{v.permitExpiry ? new Date(v.permitExpiry).toLocaleDateString() : "N/A"}</span></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginTop: '2rem', justifyContent: 'flex-end', borderTop: '2px solid #eee', paddingTop: '1.5rem' }}>
              <button 
                onClick={() => { handleResolveDeletion(viewingDeletionReq._id, "reject"); setViewingDeletionReq(null); }}
                style={{ background: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Reject Request
              </button>
              <button 
                onClick={() => { handleResolveDeletion(viewingDeletionReq._id, "approve"); setViewingDeletionReq(null); }}
                style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Approve Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecycleBin && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="manage-clients-modal" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', maxWidth: '800px', width: '90%', maxHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}><FiTrash2 style={{ marginRight: '10px', color: '#e74c3c' }} /> Recycle Bin</h2>
              <button className="close-btn" onClick={() => { setShowRecycleBin(false); setSelectedRecycleLogs([]); }}><FiX /></button>
            </div>
            
            {recycleBinLogs.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#f8f9fa', padding: '10px 15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#2c3e50' }}>
                  <input 
                    type="checkbox" 
                    checked={recycleBinLogs.length > 0 && selectedRecycleLogs.length === recycleBinLogs.length}
                    onChange={handleSelectAllRecycle}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  Select All
                </label>
                {selectedRecycleLogs.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={handleBulkRestore}
                      style={{ background: '#3498db', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <FiRefreshCcw /> Restore Selected ({selectedRecycleLogs.length})
                    </button>
                    <button 
                      onClick={handlePermanentDelete}
                      style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <FiTrash2 /> Permanently Delete Selected ({selectedRecycleLogs.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
              {recycleBinLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#7f8c8d', padding: '3rem 0' }}>
                  <FiTrash2 size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <h3>Recycle bin is empty</h3>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                  {recycleBinLogs.map(log => (
                    <div key={log._id} className="neu-detail-card" style={{ border: selectedRecycleLogs.includes(log._id) ? '2px solid var(--primary)' : '1px solid #ffffff' }}>
                      <div className="neu-card-header">
                        <h3 style={{ margin: 0, color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '15px', fontFamily: '"Lastica", sans-serif', fontSize: '1rem' }}>
                          <span className="neu-badge red">DELETED</span>
                          {log.vehicleNumber}
                        </h3>
                        <input 
                          type="checkbox" 
                          checked={selectedRecycleLogs.includes(log._id)}
                          onChange={() => toggleRecycleSelect(log._id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                        />
                      </div>
                      <div className="neu-grid-details" style={{ padding: '15px', gridTemplateColumns: '1fr 1fr' }}>
                        <div className="neu-grid-item" style={{ gridColumn: 'span 2' }}><strong>Deleted on</strong> <span>{new Date(log.createdAt).toLocaleDateString()}</span></div>
                        {log.details?.before && (
                          <>
                            <div className="neu-grid-item"><strong>Name</strong> <span>{log.details.before.fullName || "N/A"}</span></div>
                            <div className="neu-grid-item"><strong>Mobile</strong> <span>{log.details.before.mobileNumber || "N/A"}</span></div>
                            <div className="neu-grid-item"><strong>Class</strong> <span>{log.details.before.vehicleClass || "N/A"}</span></div>
                            <div className="neu-grid-item"><strong>Insurance</strong> <span>{log.details.before.insuranceExpiry ? new Date(log.details.before.insuranceExpiry).toLocaleDateString() : "N/A"}</span></div>
                          </>
                        )}
                        {log.details?.description && <div className="neu-grid-item" style={{ gridColumn: 'span 2' }}><strong>Reason</strong> <span>{log.details.description}</span></div>}
                      </div>
                      <div style={{ padding: '0 15px 15px 15px', marginTop: 'auto' }}>
                        <button onClick={() => handleRestoreVehicle(log._id)} className="nav-btn outline" style={{ width: '100%', background: 'var(--bg-color)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <FiRefreshCcw /> Restore Vehicle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
    {user && user.role === "admin" && remainingTokens <= 50 && (
      <div className="token-warning-banner">
        <span>⚠️ <strong>Low Balance Alert:</strong> Only {remainingTokens} API verification tokens remaining. Verification will block if tokens hit 0.</span>
        <a 
          href="https://dashboard.attestr.com/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="banner-refill-link"
        >
          Recharge Credits ↗
        </a>
      </div>
    )}
    </>
  );
};

export default Navbar;
