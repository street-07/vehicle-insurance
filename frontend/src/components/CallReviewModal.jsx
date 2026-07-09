import React, { useState } from "react";
import ReactDOM from "react-dom";
import { FiX, FiCheck } from "react-icons/fi";

const predefinedReasons = [
  "Call not picked",
  "Number busy / Switch off",
  "Wrong number / Invalid",
  "Not interested",
  "Asked to call back later",
  "Custom Reason..."
];

const CallReviewModal = ({ onClose, onSave, initialReason }) => {
  const [selectedReason, setSelectedReason] = useState(() => {
    if (!initialReason) return "";
    if (predefinedReasons.includes(initialReason)) return initialReason;
    return "Custom Reason...";
  });
  const [customReason, setCustomReason] = useState(() => {
    if (initialReason && !predefinedReasons.includes(initialReason)) return initialReason;
    return "";
  });

  const handleSave = () => {
    const finalReason = selectedReason === "Custom Reason..." ? customReason : selectedReason;
    onSave(finalReason);
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(230, 234, 240, 0.4)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="modal-content" style={{ 
        background: 'var(--bg-color)', 
        borderRadius: '24px', 
        padding: '20px', 
        width: '600px', 
        border: 'var(--clay-border)',
        boxShadow: 'var(--shadow-outer)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>Call Outcome</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#888' }}><FiX /></button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Select Reason:</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {predefinedReasons.map((reason) => (
              <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input 
                  type="radio" 
                  name="reason" 
                  value={reason} 
                  checked={selectedReason === reason} 
                  onChange={(e) => setSelectedReason(e.target.value)} 
                />
                {reason}
              </label>
            ))}
          </div>
        </div>

        {selectedReason === "Custom Reason..." && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Custom Reason:</label>
            <input 
              type="text" 
              value={customReason} 
              onChange={(e) => setCustomReason(e.target.value)} 
              placeholder="Type custom note here..."
              style={{ width: '100%', padding: '0.8rem 1rem', marginTop: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--bg-color)', boxShadow: 'var(--shadow-inner)', fontFamily: 'inherit', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
              autoFocus
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#f1f1f1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{
            background: 'var(--success)', color: 'white', border: '1px solid #ffffff', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: 'var(--shadow-outer-sm)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
          onMouseDown={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-inner-sm)'; e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-outer-sm)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <FiCheck /> Save Outcome
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CallReviewModal;
