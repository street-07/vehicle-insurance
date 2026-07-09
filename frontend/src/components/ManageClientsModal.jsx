import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ManageClientsModal.css";
import { FiX, FiTrash2, FiCalendar, FiUsers, FiArchive, FiPieChart, FiActivity, FiClock } from "react-icons/fi";
import VehicleRow from "./VehicleRow";
import { VehicleContext } from "../context/VehicleContext";

const API = axios.create({ baseURL: "/api/admin" });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

const ManageClientsModal = ({ onClose }) => {
  const { fetchVehicles: fetchClientVehicles } = React.useContext(VehicleContext);
  const [viewMode, setViewMode] = useState("HUB"); // HUB, ACTIVE, ARCHIVED
  
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState({ assignedVehicles: [], logs: [] });
  
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewRowsMode, setViewRowsMode] = useState(null); 
  const [showLogs, setShowLogs] = useState(false);
  
  const [poolCount, setPoolCount] = useState(0);
  const [backlogTotal, setBacklogTotal] = useState(0);
  const [reassignPendingTotal, setReassignPendingTotal] = useState(0);
  const [allocations, setAllocations] = useState({});
  const [apiLimits, setApiLimits] = useState({});
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState(0);

  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: "", email: "", password: "" });

  const [enableTopologyView, setEnableTopologyView] = useState(false);
  const [topologyData, setTopologyData] = useState({ nodeControllers: [], standalone: [] });
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [newNodeConfig, setNewNodeConfig] = useState({ name: "", email: "", password: "" });

  const fetchTopology = async () => {
    try {
      const res = await API.get("/topology");
      setEnableTopologyView(true);
      setTopologyData(res.data);
    } catch (err) {
      setEnableTopologyView(false);
    }
  };

  useEffect(() => {
    fetchTopology();
  }, []);

  const fetchClients = async () => {
    try {
      let endpoint = "/clients";
      if (viewMode === "ARCHIVED") endpoint = "/clients/archived";
      const res = await API.get(endpoint);
      setClients(res.data);
      setLoading(false);
      
      if (viewMode === "HUB") {
        const initAlloc = {};
        const initLimits = {};
        res.data.forEach(c => {
          initAlloc[c._id] = 0;
          initLimits[c._id] = c.dailyApiLimit || 50;
        });
        setAllocations(initAlloc);
        setApiLimits(initLimits);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };



  const fetchPoolCount = async () => {
    try {
      const res = await API.get(`/pool?date=${filterDate}`);
      setPoolCount(res.data.count);
      setBacklogTotal(res.data.backlogTotal || 0);
      setReassignPendingTotal(res.data.reassignPendingTotal || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setClients([]);
    fetchClients();
    if (viewMode === "HUB" || viewMode === "ARCHIVED") {
      if (viewMode === "HUB") fetchPoolCount();
      setSelectedClient(null);
    } else if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [viewMode, filterDate]);

  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    try {
      const res = await API.get(`/clients/${client._id}`);
      setClientDetails(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedClient && viewMode !== "HUB") {
      handleSelectClient(selectedClient);
    }
  }, [selectedClient, viewMode]);

  const handleAllocationChange = (clientId, val) => {
    const newVal = parseInt(val) || 0;
    setAllocations({ ...allocations, [clientId]: newVal });
  };

  const handleApiLimitChange = (clientId, val) => {
    setApiLimits({ ...apiLimits, [clientId]: parseInt(val) || 0 });
  };

  const distributeVehicles = async () => {
    const payloadAllocations = Object.entries(allocations).map(([clientId, amount]) => ({
      clientId,
      amount,
      dailyApiLimit: apiLimits[clientId]
    }));
    try {
      const res = await API.post("/distribute", { date: filterDate, allocations: payloadAllocations });
      alert(res.data.message);
      fetchClients();
      fetchPoolCount();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to distribute vehicles");
    }
  };

  const autoAssignBacklog = async () => {
    if (window.confirm(`Are you sure you want to automatically distribute all ${backlogTotal} backlog vehicles equally to active clients?`)) {
      try {
        const res = await API.post("/backlog/auto-assign", { date: filterDate });
        alert(res.data.message);
        fetchPoolCount();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to auto-assign backlog.");
      }
    }
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTo || transferAmount <= 0) return alert("Please select clients and an amount to transfer.");
    if (transferFrom === transferTo) return alert("Cannot transfer to the same client.");
    
    try {
      const res = await API.post('/transfer', { fromClient: transferFrom, toClient: transferTo, amount: parseInt(transferAmount) });
      alert(res.data.message);
      fetchClients();
      setTransferAmount(0);
      setTransferFrom("");
      setTransferTo("");
    } catch (err) {
      alert(err.response?.data?.message || "Transfer failed");
    }
  };

  const clearHistory = async () => {
    if (!selectedClient) return;
    if (window.confirm(`Are you sure you want to completely clear history for ${selectedClient.name}?`)) {
      try {
        await API.delete(`/clients/${selectedClient._id}/history`);
        alert("History cleared.");
        handleSelectClient(selectedClient);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    if (window.confirm("Are you sure you want to permanently delete this client?")) {
      try {
        await API.delete(`/clients/${selectedClient._id}`);
        alert("Client deleted successfully.");
        window.location.reload();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete client.");
      }
    }
  };

  const handleCreateClient = async () => {
    if (!newClientData.name || !newClientData.email || !newClientData.password) {
      return alert("Please fill all fields.");
    }
    try {
      const res = await API.post("/clients", newClientData);
      alert(res.data.message);
      setShowAddClient(false);
      setNewClientData({ name: "", email: "", password: "" });
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create client.");
    }
  };

  const handleProvisionNode = async () => {
    if (!newNodeConfig.name || !newNodeConfig.email || !newNodeConfig.password) {
      return alert("All parameter configurations are required.");
    }
    try {
      const res = await API.post("/nodes", newNodeConfig);
      alert(res.data.message);
      setShowNodeForm(false);
      setNewNodeConfig({ name: "", email: "", password: "" });
      fetchTopology();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to provision service node.");
    }
  };



  const handleUndoLog = async (logId) => {
    if (window.confirm("Are you sure you want to undo this action and restore the previous data?")) {
      try {
        await API.post(`/undo-log/${logId}`);
        setClientDetails(prev => ({
          ...prev,
          logs: prev.logs.map(l => l._id === logId ? { ...l, action: l.action + " (UNDONE by Admin)" } : l)
        }));
        fetchClientVehicles(); // Auto-reload the client dashboard
      } catch (err) {
        alert(err.response?.data?.message || "Failed to undo action.");
      }
    }
  };

  const handleRedoLog = async (logId) => {
    if (window.confirm("Are you sure you want to redo this action?")) {
      try {
        await API.post(`/redo-log/${logId}`);
        setClientDetails(prev => ({
          ...prev,
          logs: prev.logs.map(l => l._id === logId ? { ...l, action: l.action.replace(" (UNDONE by Admin)", "") } : l)
        }));
        fetchClientVehicles(); // Auto-reload the client dashboard
      } catch (err) {
        alert(err.response?.data?.message || "Failed to redo action.");
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="manage-clients-modal">
        
        {/* INNER NAVBAR */}
        <div className="client-navbar">
          <h2>Admin Control Center</h2>
          <div className="client-navbar-actions">
            
            <button className={`nav-btn ${viewMode === "HUB" ? "active" : "outline"}`} onClick={() => setViewMode("HUB")}>
              <FiPieChart /> Distribution Hub
            </button>
            <button className={`nav-btn ${viewMode === "ACTIVE" ? "active" : "outline"}`} onClick={() => setViewMode("ACTIVE")}>
              <FiUsers /> Active Clients
            </button>
            <button className={`nav-btn ${viewMode === "PERFORMANCE" ? "active" : "outline"}`} onClick={() => setViewMode("PERFORMANCE")}>
              <FiActivity /> Performance
            </button>
            <button className={`nav-btn ${viewMode === "ARCHIVED" ? "active" : "outline"}`} onClick={() => setViewMode("ARCHIVED")}>
              <FiArchive /> Archived Clients
            </button>


            <div className="date-filter-wrapper">
              <FiCalendar />
              <input 
                type="date" 
                value={filterDate} 
                onChange={e => setFilterDate(e.target.value)} 
                className="modal-date-picker"
                disabled={viewMode !== "HUB"}
                title={viewMode !== "HUB" ? "Date filtering is managed in the Distribution Hub" : "Select target date"}
              />
            </div>
            <button className="close-btn" onClick={onClose}><FiX /></button>
          </div>
        </div>

        <div className="modal-content-split">
          
          {viewMode === "HUB" ? (
            <div className="distribution-hub full-width" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="hub-sticky-header">
                <div className="hub-header-stats">
                  {backlogTotal > 0 && (
                    <div className="stat-badge backlog-badge">
                      <strong>TOP PRIORITY:</strong> {backlogTotal} unassigned vehicles in backlog (45+ days).
                      <button className="auto-assign-btn" onClick={autoAssignBacklog}>
                        AUTO-ASSIGN EQUALLY
                      </button>
                    </div>
                  )}

                  <div className="stat-badge pool-badge">
                    <FiPieChart style={{ marginRight: '5px' }} /> 
                    <span>Available Pool (45-Day Radar): <strong>{poolCount}</strong></span>
                  </div>

                  <div className="stat-badge pool-badge" style={{ marginLeft: '10px' }}>
                    <FiClock style={{ marginRight: '5px' }} /> 
                    <span>Reassign Pending Vehicles: <strong>{reassignPendingTotal}</strong></span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', marginTop: '1.5rem', padding: '0 1rem 2rem 1rem', flex: 1, minHeight: 0 }}>
                {/* LEFT COLUMN: Transfer Station */}
                <div className="neu-panel transfer-station">
                  <h4 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Transfer Station</h4>
                  <p className="alloc-notice">Move active vehicles between clients.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '1.5rem' }}>
                    <div className="transfer-select-group">
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' }}>From Client</label>
                      <select value={transferFrom} onChange={e => setTransferFrom(e.target.value)} className="neu-input">
                        <option value="">-- Select Origin --</option>
                        {clients.filter(c => c.assignedCount > 0).map(c => (
                          <option key={`from-${c._id}`} value={c._id}>{c.name} ({c.assignedCount} avail)</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="transfer-select-group">
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' }}>To Client</label>
                      <select value={transferTo} onChange={e => setTransferTo(e.target.value)} className="neu-input">
                        <option value="">-- Select Destination --</option>
                        {clients.filter(c => c._id !== transferFrom).map(c => (
                          <option key={`to-${c._id}`} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="transfer-select-group" style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' }}>Amount</label>
                      <input 
                        type="number" 
                        min="1" 
                        placeholder="Number of vehicles" 
                        value={transferAmount || ""} 
                        onChange={e => setTransferAmount(e.target.value)}
                        className="neu-input"
                      />
                    </div>
                    
                    <button 
                      onClick={handleTransfer}
                      className="neu-btn"
                      style={{ marginTop: '10px', width: '100%', color: 'var(--primary)', justifyContent: 'center' }}
                    >
                      EXECUTE TRANSFER
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: Smart Allocation Tiles */}
                <div className="neu-panel allocation-station" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexShrink: 0 }}>
                    <div>
                      <h4 style={{ color: 'var(--primary)', marginBottom: '5px' }}>Client Workload & Allocation</h4>
                      <p className="alloc-notice" style={{ margin: 0 }}>Assign new vehicles from the pool.</p>
                    </div>
                    <button className="neu-btn" onClick={distributeVehicles} style={{ background: 'var(--primary)', color: 'white' }}>
                      CONFIRM ALLOCATION
                    </button>
                  </div>
                  
                  <div className="smart-tiles-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', alignContent: 'start', gap: '1rem', flex: 1, overflowY: 'scroll', padding: '0.5rem', paddingRight: '1rem', minHeight: 0 }}>
                    {clients.map((client, idx) => {
                      const maxCapacity = 100;
                      const highThreshold = 80;
                      const mediumThreshold = 50;
                      const assigned = client.assignedCount;
                      
                      let timelineColor;
                      let markerColor;
                      if (assigned >= highThreshold) {
                         timelineColor = 'linear-gradient(90deg, #D31027 0%, #EA384D 100%)'; // Red
                         markerColor = '#D31027';
                      } else if (assigned >= mediumThreshold) {
                         timelineColor = 'linear-gradient(90deg, #F2994A 0%, #F2C94C 100%)'; // Yellow/Orange
                         markerColor = '#F2994A';
                      } else {
                         timelineColor = 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)'; // Green
                         markerColor = '#11998e';
                      }

                      const progressWidth = Math.min((assigned / maxCapacity) * 100, 100);

                      const apiLimitVal = apiLimits[client._id] || 0;
                      const apiMaxCapacity = 200;
                      const apiProgressWidth = Math.min((apiLimitVal / apiMaxCapacity) * 100, 100);
                      
                      return (
                        <div key={client._id} className="smart-client-tile">
                          <div className="tile-content" style={{ gap: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.4rem' }}>
                              <div className="tile-info">
                                <span className="tile-name" style={{ fontSize: '1.05rem', lineHeight: '1.2', marginBottom: '2px', fontWeight: 'bold' }}>{idx + 1}. {client.name}</span>
                              </div>
                            </div>

                            {/* VEHICLE ALLOCATION INPUT FEATURE */}
                            <div className="vehicle-allocation-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>Vehicle Allocation Box:</span>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={allocations[client._id] || 0}
                                  onChange={e => handleAllocationChange(client._id, e.target.value)}
                                  className="neu-input alloc-input"
                                  style={{ width: '70px', padding: '2px 4px', fontSize: '0.8rem', textAlign: 'center', height: '24px' }}
                                  placeholder="Vehicles"
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                                <span>Vehicles Assigned:</span>
                                <strong style={{ color: markerColor, marginLeft: '0.4rem' }}>{assigned}</strong>
                              </div>
                            </div>

                            {/* API CALLS ALLOWED INPUT FEATURE */}
                            <div className="api-limit-indicator-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>API Calling Box:</span>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={apiLimits[client._id] || 0}
                                  onChange={e => handleApiLimitChange(client._id, e.target.value)}
                                  className="neu-input alloc-input"
                                  style={{ width: '70px', padding: '2px 4px', fontSize: '0.8rem', textAlign: 'center', height: '24px' }}
                                  placeholder="API Limit"
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                                <span>API Assigned:</span>
                                <strong style={{ color: 'var(--primary)', marginLeft: '0.4rem' }}>{apiLimitVal}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === "PERFORMANCE" ? (
            <div className="client-list-section full-width" style={{ padding: '2rem', background: 'var(--bg-color)', overflowY: 'auto' }}>
              <h3 style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', marginBottom: '2rem', color: 'var(--primary)', fontFamily: '"Lastica", sans-serif', fontSize: '1.2rem' }}>Team Performance Analytics</h3>
              
              {(() => {
                const activeClients = clients;
                const tillDateSorted = [...activeClients].sort((a, b) => (b.totalAssignedCount || 0) - (a.totalAssignedCount || 0));
                const yearlySorted = [...activeClients].sort((a, b) => (b.yearlyAssignedCount || 0) - (a.yearlyAssignedCount || 0));
                const monthlySorted = [...activeClients].sort((a, b) => (b.monthlyAssignedCount || 0) - (a.monthlyAssignedCount || 0));
                
                return (
                  <>
                    <div style={{ marginBottom: '2rem' }}>
                      <h4 style={{ color: '#555', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Vehicles Assigned (Till Date)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {tillDateSorted.map((c, i) => (
                          <div key={`td-${c._id}`} style={{ background: '#e0e5ec', padding: '1.5rem', borderRadius: '12px', boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.05), inset -4px -4px 8px rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 'bold' }}>Rank #{i + 1}</span>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)', margin: '0.8rem 0', textAlign: 'center' }}>{c.name}</span>
                            <span style={{ fontSize: '2rem', fontWeight: '900', color: '#2c3e50' }}>{c.totalAssignedCount || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <hr style={{ border: 'none', borderTop: '2px solid rgba(0,0,0,0.05)', marginBottom: '2rem' }} />
                    
                    <div style={{ marginBottom: '2rem' }}>
                      <h4 style={{ color: '#555', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicles Assigned (This Year)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {yearlySorted.map((c, i) => (
                          <div key={`yr-${c._id}`} style={{ background: '#e0e5ec', padding: '1.5rem', borderRadius: '12px', boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.05), inset -4px -4px 8px rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 'bold' }}>Rank #{i + 1}</span>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)', margin: '0.8rem 0', textAlign: 'center' }}>{c.name}</span>
                            <span style={{ fontSize: '2rem', fontWeight: '900', color: '#2c3e50' }}>{c.yearlyAssignedCount || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '2px solid rgba(0,0,0,0.05)', marginBottom: '2rem' }} />

                    <div style={{ marginBottom: '2rem' }}>
                      <h4 style={{ color: '#555', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicles Assigned (This Month)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {monthlySorted.map((c, i) => (
                          <div key={`mo-${c._id}`} style={{ background: '#e0e5ec', padding: '1.5rem', borderRadius: '12px', boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.05), inset -4px -4px 8px rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 'bold' }}>Rank #{i + 1}</span>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)', margin: '0.8rem 0', textAlign: 'center' }}>{c.name}</span>
                            <span style={{ fontSize: '2rem', fontWeight: '900', color: '#2c3e50' }}>{c.monthlyAssignedCount || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '2px solid rgba(0,0,0,0.05)', marginBottom: '2rem' }} />

                    <div style={{ marginBottom: '2rem' }}>
                      <h4 style={{ color: '#555', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Document Renewal Performance</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                        {activeClients.map((c) => {
                          const pct = c.totalAssignedCount > 0 ? Math.round((c.renewedCount / c.totalAssignedCount) * 100) : 0;
                          return (
                            <div key={`ren-${c._id}`} style={{ background: '#e0e5ec', padding: '1.5rem', borderRadius: '12px', boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.05), inset -4px -4px 8px rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.8rem', textAlign: 'center' }}>{c.name}</span>
                              <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#2c3e50' }}>{c.renewedCount || 0} / {c.totalAssignedCount || 0}</span>
                              <span style={{ fontSize: '0.85rem', color: pct >= 80 ? '#27ae60' : pct >= 50 ? '#f39c12' : '#e74c3c', fontWeight: 'bold', marginTop: '0.5rem' }}>{pct}% Renewed</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <>
              {/* LEFT SIDE: CLIENT LIST */}
              <div className="clients-list-sidebar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>{viewMode === "ARCHIVED" ? "Archived Clients" : "Registered Clients"}</h3>
                  {viewMode === "ACTIVE" && (
                    <button 
                      onClick={() => setShowAddClient(!showAddClient)}
                      style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
                      title="Add New Client"
                    >
                      +
                    </button>
                  )}
                </div>

                {showAddClient && viewMode === "ACTIVE" && (
                  <div style={{ background: '#f1f2f6', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #dcdde1' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#2f3640' }}>Create New Client</h4>
                    <input type="text" placeholder="Client Name" className="neu-input" style={{ marginBottom: '0.5rem', width: '100%' }} value={newClientData.name} onChange={e => setNewClientData({...newClientData, name: e.target.value})} />
                    <input type="email" placeholder="Email Address" className="neu-input" style={{ marginBottom: '0.5rem', width: '100%' }} value={newClientData.email} onChange={e => setNewClientData({...newClientData, email: e.target.value})} />
                    <input type="password" placeholder="Password" className="neu-input" style={{ marginBottom: '0.5rem', width: '100%' }} value={newClientData.password} onChange={e => setNewClientData({...newClientData, password: e.target.value})} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleCreateClient} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>Save</button>
                      <button onClick={() => setShowAddClient(false)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>Cancel</button>
                    </div>
                  </div>
                )}

                {loading && <p>Loading clients...</p>}
                {!loading && clients.length === 0 && <p>No clients found.</p>}
                <ul className="clients-ul">
                  {clients.map((client, idx) => (
                    <li 
                      key={client._id} 
                      className={`client-li ${selectedClient?._id === client._id ? "active" : ""}`}
                      onClick={() => handleSelectClient(client)}
                    >
                      <span className="client-name">
                        {viewMode === "ARCHIVED" && <FiArchive style={{ marginRight: '5px' }} />}
                        Client {idx + 1}: {client.name}
                      </span>
                      <span className="client-stats">
                        Total Locked: {client.assignedCount} | Logs: {client.logCount}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* RIGHT SIDE: CLIENT DETAILS & ACTIONS */}
              <div className="client-details-area">
                {!selectedClient && viewMode === "ARCHIVED" && clients.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <FiArchive size={64} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                    <h3>No Archived Clients</h3>
                    <p style={{ maxWidth: '400px', margin: '0 auto' }}>When you delete a client, their full history, logs, and details will be preserved and displayed here.</p>
                  </div>
                )}

                {!selectedClient && viewMode === "ARCHIVED" && clients.length > 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
                    <FiArchive size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>Select an archived client</h3>
                    <p>Click on a deleted client from the sidebar to view their history and logs.</p>
                  </div>
                )}
                {selectedClient && (
                  <div className="client-info-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>{viewMode === "ARCHIVED" ? "Archived Dashboard for:" : "Viewing Dashboard for:"} {selectedClient.name}</h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="del-history-btn" onClick={clearHistory}>
                          <FiTrash2 /> Clear Logs
                        </button>
                        {viewMode === "ACTIVE" && (
                          <button className="del-client-btn" onClick={handleDeleteClient} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                            <FiTrash2 /> Delete Client
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="details-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>Assigned Vehicles (45-Day Lock & Extra Work)</h4>
                        {clientDetails.assignedVehicles.length > 0 && (
                          <button 
                            className="del-history-btn" 
                            style={{ background: '#4169E1' }}
                            onClick={() => setViewRowsMode(clientDetails.assignedVehicles)}
                          >
                            VIEW FULL LIST
                          </button>
                        )}
                      </div>
                      <p className="alloc-notice">Vehicles listed here are strictly locked to {selectedClient.name} and cannot be automatically rotated until their lock expires.</p>
                      
                      {clientDetails.assignedVehicles.length > 0 && (
                        <div className="mini-vehicle-list">
                          {clientDetails.assignedVehicles.map((v, i) => {
                            const isExtraWork = v.extraWorkUntil && new Date(v.extraWorkUntil) >= new Date();
                            return (
                              <div 
                                key={v._id} 
                                className="mini-row" 
                                style={{ 
                                  cursor: 'pointer', 
                                  transition: '0.2s',
                                  borderLeft: isExtraWork ? '4px solid #e67e22' : '4px solid #4169E1' 
                                }}
                                title="Click to Review Row"
                                onClick={() => setViewRowsMode([v])}
                              >
                                {i + 1}. {v.vehicleNumber} {isExtraWork && <span style={{ color: '#e67e22', fontSize: '0.7rem', marginLeft: '5px' }}>(Extra Work)</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="details-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0 }}>Activity Log</h4>
                        <button 
                          onClick={() => setShowLogs(!showLogs)}
                          className="neu-btn"
                          style={{ background: 'var(--primary)', color: 'white', padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                        >
                          {showLogs ? 'Hide Activity Log' : 'Show Activity Log'}
                        </button>
                      </div>
                      
                      {showLogs && (
                        <div style={{ marginTop: '1rem' }}>
                          {clientDetails.logs.length === 0 ? <p>No activity yet.</p> : (
                            <div className="logs-list">
                              {clientDetails.logs.map(log => (
                                <div key={log._id} className="log-item">
                                  <div className="log-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <strong>{log.action}</strong>
                                    <div 
                                      className="mini-row"
                                      onClick={() => log.details?.after && setViewRowsMode([{...log.details.after, _id: log.vehicleId}])}
                                      style={{ margin: 0, padding: '5px 10px', fontSize: '0.8rem' }}
                                      title="Click to view vehicle"
                                    >
                                      {log.details?.after?.fullName || "Unknown Owner"} ({log.vehicleNumber})
                                    </div>
                                    <span className="log-time" style={{ marginLeft: 'auto' }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                                  </div>
                                  <div className="log-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{log.details.description}</span>
                                    {log.action === "UPDATE" && !log.action.includes("UNDONE") && (
                                      <button 
                                        onClick={() => handleUndoLog(log._id)} 
                                        style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                      >
                                        Undo Change
                                      </button>
                                    )}
                                    {log.action.includes("UNDONE") && (
                                      <button 
                                        onClick={() => handleRedoLog(log._id)} 
                                        style={{ background: '#3498db', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                      >
                                        Redo Change
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
      
      {viewRowsMode && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="manage-clients-modal" style={{ padding: '2rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2>Review Assigned Vehicles of {selectedClient?.name}</h2>
              <button className="close-btn" onClick={() => {
                setViewRowsMode(null);
                handleSelectClient(selectedClient);
              }}><FiX /></button>
            </div>
            <div className="vehicle-list">
              {viewRowsMode.map((v, idx) => (
                <VehicleRow key={v._id} vehicle={v} itemNum={idx + 1} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageClientsModal;
