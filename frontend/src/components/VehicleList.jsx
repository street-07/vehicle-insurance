import React, { useContext, useState } from "react";
import { VehicleContext } from "../context/VehicleContext";
import { AuthContext } from "../context/AuthContext";
import VehicleRow from "./VehicleRow";
import { FiRefreshCw } from "react-icons/fi";
import "./VehicleList.css";

const ITEMS_PER_PAGE = 100;

const VehicleList = () => {
  const { 
    vehicles, 
    loading, 
    error, 
    searchQuery, 
    removeBulkVehicles,
    showAll,
    filterDate,
    refreshDaysVehicles,
    fetchVehicles,
    refreshVehiclesBulk
  } = useContext(VehicleContext);
  const { user } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVehicles, setSelectedVehicles] = useState([]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) return <div className="state-message">Loading vehicles...</div>;
  if (error) return <div className="state-message error">{error}</div>;
  if (!vehicles || vehicles.length === 0) return <div className="state-message">Not Found</div>;

  let displayVehicles = [...vehicles];
  let searchMatches = [];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const matches = [];
    
    displayVehicles.forEach(v => {
      const isMatch = (v.vehicleNumber && v.vehicleNumber.toLowerCase().includes(q)) || 
                      (v.mobileNumber && v.mobileNumber.toLowerCase().includes(q)) ||
                      (v.fullName && v.fullName.toLowerCase().includes(q)) ||
                      (v.vehicleClass && v.vehicleClass.toLowerCase().includes(q));
      
      if (isMatch) matches.push(v);
    });
    
    if (matches.length === 0) {
      return <div className="state-message" style={{ textAlign: 'center', marginTop: '2rem', color: '#e74c3c', fontWeight: 'bold' }}>The vehicle is not in database.</div>;
    }
    
    searchMatches = matches;
    displayVehicles = matches;
  }

  const totalPages = Math.ceil(displayVehicles.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentVehicles = displayVehicles.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const toggleSelect = (id) => {
    setSelectedVehicles(prev => 
      prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    removeBulkVehicles(selectedVehicles);
    setSelectedVehicles([]);
  };

  const handleRefreshDaysVehicles = () => {
    const targetDate = filterDate || new Date().toISOString().split("T")[0];
    const sectionName = showAll === "reassign" ? "Reassign Pending" : "Expired / Expiring Today";
    if (window.confirm(`Are you sure you want to refresh all vehicles in the ${sectionName} section?`)) {
      refreshDaysVehicles(targetDate, showAll);
    }
  };

  const handleBulkRefresh = async () => {
    if (selectedVehicles.length > 0) {
      if (window.confirm(`Are you sure you want to refresh API expiries for the ${selectedVehicles.length} selected vehicles?`)) {
        await refreshVehiclesBulk(selectedVehicles);
        setSelectedVehicles([]);
      }
    }
  };

  return (
    <div className="vehicle-list-container" style={{ position: 'relative' }}>
      {/* TOOLBAR FOR VIEW TOGGLING (Admin only) */}
      {user && user.role === "admin" && (
        <div className="list-toolbar" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '1.2rem', gap: '10px' }}>
          <button 
            className={`nav-btn ${showAll === "true" ? 'active' : 'outline'}`} 
            onClick={() => fetchVehicles("true")}
          >
            Full Database
          </button>
          <button 
            className={`nav-btn ${showAll === "false" ? 'active' : 'outline'}`} 
            onClick={() => fetchVehicles("false")}
          >
            Expired / Expiring Today
          </button>
          <button 
            className={`nav-btn ${showAll === "reassign" ? 'active' : 'outline'}`} 
            onClick={() => fetchVehicles("reassign")}
          >
            Reassign Pending
          </button>
        </div>
      )}

      {selectedVehicles.length > 0 && (
        <div style={{ position: 'sticky', top: '10px', background: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
          <span>{selectedVehicles.length} vehicles selected</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setSelectedVehicles([])} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleBulkRefresh} style={{ background: '#f39c12', border: 'none', color: 'white', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Refresh Selected</button>
            <button onClick={handleBulkDelete} style={{ background: '#e74c3c', border: 'none', color: 'white', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Delete Selected</button>
          </div>
        </div>
      )}
      <div className="table-header">
        <div className="td-cell main-cell" style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-start', paddingLeft: '1.2rem' }}>
          <span style={{ width: '16px', display: 'inline-block' }}></span> 
          <span style={{ margin: '0 6px 0 10px', minWidth: '20px', display: 'inline-block' }}></span>
          <span>Vehicle No.</span>
        </div>
        <div className="td-cell">Full Name</div>
        <div className="td-cell">Vehicle Class</div>
        <div className="td-cell">Number</div>
        <div className="td-cell">Fitness</div>
        <div className="td-cell">Tax</div>
        <div className="td-cell">PUC</div>
        <div className="td-cell">Permit</div>
        <div className="td-cell">Nat. Permit</div>
        <div className="td-cell">Insurance</div>
        <div className="td-cell actions-cell" style={{ justifyContent: 'center' }}>
          <span>Actions</span>
          {showAll !== "true" && (
            <button 
              onClick={handleRefreshDaysVehicles} 
              className="action-btn icon-btn row-refresh-btn" 
              title="Refresh All Vehicles in This Section"
              style={{ width: '24px', height: '24px', fontSize: '0.85rem' }}
            >
              <FiRefreshCw />
            </button>
          )}
        </div>
      </div>
      
      <div className="vehicle-list">
        {currentVehicles.map((vehicle, idx) => (
          <VehicleRow key={vehicle._id} vehicle={vehicle} itemNum={startIdx + idx + 1} isSelected={selectedVehicles.includes(vehicle._id)} toggleSelect={toggleSelect} />
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="page-btn"
          >
            Prev
          </button>
          <span className="page-info">
            {currentPage} / {totalPages}
          </span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="page-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default VehicleList;
