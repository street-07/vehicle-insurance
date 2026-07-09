import React from "react";
import { createPortal } from "react-dom";
import "./InfoModal.css";

const InfoModal = ({ type, onClose }) => {
  const getContent = () => {
    switch (type) {
      case "privacy":
        return {
          title: "Privacy Policy",
          body: (
            <div className="info-content-body">
              <p className="info-intro">
                FastPaper is a company-operated compliance and document lifecycle management platform. This Privacy Policy explains how we collect, store, use, and protect information when Administrators and Employees operate the software.
              </p>
              
              <div className="info-section-item">
                <h3>1. Information We Collect</h3>
                <p>To facilitate fleet compliance monitoring, the platform processes the following data:</p>
                <ul>
                  <li><strong>Vehicle Compliance Data:</strong> Registration numbers, document expiry dates (PUC, insurance, permit, national permit, fitness, tax), and owner names retrieved from RTO registries.</li>
                  <li><strong>Account Credentials:</strong> Full names, corporate email addresses, and secure salted bcrypt password hashes of system administrators and employees.</li>
                  <li><strong>Activity Logs:</strong> Chronological records of actions performed within the system (e.g., adding, editing, or deleting vehicle records) to ensure system auditability.</li>
                </ul>
              </div>

              <div className="info-section-item">
                <h3>2. How We Use Information</h3>
                <p>Collected information is used exclusively to:</p>
                <ul>
                  <li>Provide real-time compliance dashboards and track document expiries.</li>
                  <li>Assign vehicles to specific employees for client management.</li>
                  <li>Maintain secure access levels separating Administrators (who provision nodes, manage client allocations, and control settings) and Employees/Clients.</li>
                  <li>Audit system integrity using detailed logs of data mutations.</li>
                </ul>
              </div>

              <div className="info-section-item">
                <h3>3. Data Sharing and Protection</h3>
                <p>FastPaper operates under a strict data integrity protocol:</p>
                <ul>
                  <li><strong>No Third-Party Disclosures:</strong> We do not sell, rent, or lease any fleet or user data to external advertising networks or aggregators.</li>
                  <li><strong>Internal Auditing:</strong> Data is shared only between approved administrative and employee accounts mapped under the company network hierarchy.</li>
                  <li><strong>Encryption & Security:</strong> Account credentials and sessions are secured using JWT tokens and cryptographic hashing.</li>
                </ul>
              </div>

              <div className="info-section-item">
                <h3>4. Contact Information</h3>
                <p>If you have any questions regarding this Privacy Policy or data security within the system, please contact our administrative desk at <strong>ujjwalmehta187@gmail.com</strong>.</p>
              </div>
            </div>
          )
        };
      case "terms":
        return {
          title: "Terms of Service",
          body: (
            <div className="info-content-body">
              <p className="info-intro">
                Please read these Terms of Service carefully. FastPaper is a company-operated software system managed by Administrators and run by Employees. By accessing or using the platform, you agree to comply with these terms.
              </p>

              <div className="info-section-item">
                <h3>1. User Roles & Account Security</h3>
                <ul>
                  <li><strong>Administrators:</strong> Hold administrative authority to manage network topology, provision nodes, assign clients/employees, undo/redo client actions, and manage platform tokens.</li>
                  <li><strong>Employees / Clients:</strong> Access the platform to input data, check RTO compliance details, and manage assigned vehicle compliance pipelines under admin supervision.</li>
                  <li><strong>Security:</strong> All users are responsible for preserving the confidentiality of their credentials. Any suspicious activity must be reported to the Administrator immediately.</li>
                </ul>
              </div>

              <div className="info-section-item">
                <h3>2. Acceptable Use Policies</h3>
                <ul>
                  <li>Users must input valid vehicle registration numbers for query purposes.</li>
                  <li>API usage limits are governed by daily thresholds (defaulting to 50 queries per user). Attempting to bypass limits or scrape RTO data is strictly prohibited.</li>
                  <li>Any activity that compromises system stability or aims to bypass approval controls will lead to immediate account termination.</li>
                </ul>
              </div>

              <div className="info-section-item">
                <h3>3. Limitation of Liability</h3>
                <p>
                  FastPaper provides compliance checking based on external registry records. While we aim for accuracy, the company does not guarantee that RTO source records are constantly free of errors. The company and its administrators are not liable for any regulatory penalties, fines, or operational losses resulting from delayed document renewals.
                </p>
              </div>

              <div className="info-section-item">
                <h3>4. System Modifications and Termination</h3>
                <p>
                  Administrators reserve the right to suspend or terminate accounts that fail to meet system guidelines. The software's features, APIs, and access limits may be periodically adjusted to align with company workflows.
                </p>
              </div>
            </div>
          )
        };
      case "about":
        return {
          title: "About Us",
          body: (
            <div className="info-content-body">
              <p className="info-intro">
                Welcome to <strong>FastPaper</strong>, the premier enterprise solution for complete vehicle compliance and automated lifecycle document management.
              </p>

              <div className="info-section-item">
                <h3>Our System Architecture</h3>
                <p>
                  FastPaper is structured as a hierarchical corporate workflow system. Senior administrators provision network nodes, manage billing credits, and distribute vehicle pools, while compliance employees manage daily operations, track upcoming document expiries, and process RTO queries.
                </p>
              </div>

              <div className="info-section-item">
                <h3>Key Operations</h3>
                <ul>
                  <li><strong>API-Driven RTO Queries:</strong> Instant retrieval of registration records, owner details, and vital document metrics.</li>
                  <li><strong>Fleet Document Lifecycle Tracking:</strong> Dynamic indicators showing countdowns for PUC, tax, fitness, permits, and insurance dates.</li>
                  <li><strong>Client & Employee Alignment:</strong> Easy distribution of compliance logs and histories to specific agents to split operational load efficiently.</li>
                  <li><strong>Audit-Safe Deletions:</strong> Safe Recycle Bin architecture allowing administrators to approve, reject, or undo mutations on vehicle logs.</li>
                </ul>
              </div>

              <div className="info-section-item">
                <h3>Our Promise</h3>
                <p>
                  We aim to make fleet logistics legally robust, minimizing human error and protecting transport operations from expensive compliance oversights.
                </p>
              </div>
            </div>
          )
        };
      case "contact":
        return {
          title: "Contact Us",
          body: (
            <div className="info-content-body contact-container">
              <p className="info-intro">
                Need support with account credentials, token refills, or system permissions? Reach out directly to our administrative team.
              </p>

              <div className="contact-card-grid">
                <div className="contact-card">
                  <div className="contact-icon">📞</div>
                  <h4>Mobile Number</h4>
                  <p className="contact-value"><a href="tel:+917360015801">+91 7360015801</a></p>
                  <p className="contact-sub">Call or WhatsApp for immediate help</p>
                </div>

                <div className="contact-card">
                  <div className="contact-icon">✉️</div>
                  <h4>Email Address</h4>
                  <p className="contact-value"><a href="mailto:ujjwalmehta187@gmail.com">ujjwalmehta187@gmail.com</a></p>
                  <p className="contact-sub">General queries & account audits</p>
                </div>
              </div>

              <div className="info-section-item contact-additional">
                <h3>Operations Support</h3>
                <p>
                  Our administrators are available from <strong>Monday to Saturday, 9:00 AM to 6:00 PM (IST)</strong>. 
                  If you are an employee requesting account approval or a node controller needing technical diagnostics, please provide your registered corporate email when contacting support.
                </p>
              </div>
            </div>
          )
        };
      default:
        return { title: "", body: null };
    }
  };

  const { title, body } = getContent();

  const modalMarkup = (
    <div className="info-modal-overlay">
      <div className="info-modal-content">
        <div className="info-modal-header">
          <h2>{title}</h2>
          <button className="info-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="info-modal-body-wrapper">
          {body}
        </div>
        <div className="info-modal-footer">
          <button className="info-action-btn" onClick={onClose}>Close Window</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalMarkup, document.body);
};

export default InfoModal;
