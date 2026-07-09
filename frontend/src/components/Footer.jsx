import React, { useState } from "react";
import InfoModal from "./InfoModal";
import "./Footer.css";

const Footer = () => {
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (e, type) => {
    e.preventDefault();
    setActiveModal(type);
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-logo">FASTPAPER</h3>
          <p>Your complete vehicle information dashboard.</p>
        </div>
        
        <div className="footer-section">
          <h4>Help & Support</h4>
          <ul>
            <li><a href="#contact" onClick={(e) => openModal(e, "contact")}>Contact Us</a></li>
            <li><a href="#about" onClick={(e) => openModal(e, "about")}>About Us</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Legal</h4>
          <ul>
            <li><a href="#privacy" onClick={(e) => openModal(e, "privacy")}>Privacy Policy</a></li>
            <li><a href="#terms" onClick={(e) => openModal(e, "terms")}>Terms of Service</a></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; FastPaper Dashboard 2026. All rights reserved.</p>
      </div>

      {activeModal && (
        <InfoModal type={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </footer>
  );
};

export default Footer;

