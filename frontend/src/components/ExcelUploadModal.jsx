import React, { useState } from "react";
import * as XLSX from "xlsx";
import * as api from "../services/api";
import "./ExcelUploadModal.css";

const ExcelUploadModal = ({ onClose, onSuccess }) => {
  const [parsedData, setParsedData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const processParsedData = (rows) => {
    if (!rows || rows.length === 0) {
      setError("File is empty.");
      return;
    }

    let headerRowIndex = 0;
    let maxMatches = 0;
    
    const vehicleKeywords = ["vehiclenumber", "vehicleno", "regno", "regnumber", "rcnumber", "registrationno", "vehno", "registrationnumber", "vehicle", "rc", "carno"];
    const allHeaderKeywords = [
       ...vehicleKeywords, 
       "name", "fullname", "owner", 
       "vehicleclass", "class", "vclass", "category", 
       "mobile", "phone", "contact", 
       "fitness", "tax", "puc", "permit", "insurance"
    ];

    // Find header row in the first 20 rows using a scoring system
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      
      let score = 0;
      row.forEach(cell => {
         const clean = String(cell || "").toLowerCase().trim().replace(/[^a-z0-9]/g, '');
         if (allHeaderKeywords.includes(clean)) score++;
      });

      if (score > maxMatches) {
        maxMatches = score;
        headerRowIndex = i;
      }
    }

    const headers = (rows[headerRowIndex] || []).map(h => String(h || "").toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    
    const mappedData = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      
      const getVal = (possibleKeys) => {
        const colIndex = headers.findIndex(h => possibleKeys.includes(h));
        if (colIndex !== -1 && row[colIndex] !== undefined && row[colIndex] !== null) {
          let val = String(row[colIndex]).trim();
          // If the cell contains an Excel error or just weird whitespace, ignore it
          return val === "NaN" || val === "undefined" ? "" : val;
        }
        return "";
      };

      const parseDateStr = (val) => {
        if (!val) return val;
        let str = String(val).trim();
        // If it's already YYYY-MM-DD, convert to DD-MM-YYYY
        let matchIso = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
        if (matchIso) {
           return `${matchIso[3].padStart(2, '0')}-${matchIso[2].padStart(2, '0')}-${matchIso[1]}`;
        }
        
        // Attempt to parse dates with slashes/dashes
        const match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
        if (match) {
          let [, num1, num2, y] = match;
          if (y.length === 2) y = "20" + y; // Assume 20XX
          
          let d = num1;
          let m = num2;
          
          // If the second number is > 12, it MUST be the day! (i.e. user supplied MM-DD-YYYY)
          if (parseInt(num2) > 12) {
             d = num2;
             m = num1;
          }
          // If the first number is > 12, it's obviously the day (DD-MM-YYYY)
          
          return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
        }
        return str;
      };

      let vehicleNumber = getVal(vehicleKeywords);
      
      // Smart Fallback: If header mapping failed (e.g., header was completely blank like in the diagnostic), 
      // safely scan the row data for anything matching an Indian Vehicle Number pattern (e.g. JH02AV0179).
      if (!vehicleNumber) {
        const found = row.find(cell => {
           let txt = String(cell || "").trim().replace(/\s/g, '');
           return /^[A-Za-z]{2}\d{1,2}[A-Za-z]{0,3}\d{4}$/.test(txt);
        });
        if (found) vehicleNumber = String(found).trim();
      }

      if (!vehicleNumber) continue;

      mappedData.push({
        vehicleNumber,
        fullName: getVal(["fullname", "name", "ownername", "owner", "customername", "customer", "client", "clientname"]),
        vehicleClass: getVal(["vehicleclass", "class", "vclass", "category"]) || "",
        mobileNumber: getVal(["mobile", "mobilenumber", "phone", "phonenumber", "contact", "contactno", "contactnumber", "cell", "cellno"]),
        fitnessExpiry: parseDateStr(getVal(["fitness", "fitnessexpiry", "fitnessupto", "fc", "fitnessvalidupto", "fitnessvalidity", "fcvalidity"])),
        taxExpiry: parseDateStr(getVal(["tax", "taxexpiry", "taxupto", "mvtax", "taxvalidupto", "roadtax", "taxvalidity"])),
        pucExpiry: parseDateStr(getVal(["puc", "pucexpiry", "pucupto", "pollution", "pucvalidupto", "emission", "pucvalidity"])),
        permitExpiry: parseDateStr(getVal(["permit", "permitexpiry", "permitupto", "pp", "permitvalidupto", "localpermit", "permitvalidity"])),
        nationalPermitExpiry: parseDateStr(getVal(["nationalpermit", "nationalpermitexpiry", "national", "np", "npupto", "nationalpermitupto", "npvalidity", "allindiapermit"])),
        insuranceExpiry: parseDateStr(getVal(["insurance", "insuranceexpiry", "insuranceupto", "ins", "insurancevalidupto", "policy", "insurancevalidity"]))
      });
    }

    if (mappedData.length > 0) {
      setParsedData(mappedData);
      setColumns(headers);
      setError(null);
    } else {
      setParsedData(null);
      setError(`No valid vehicle data found. Detected headers: [${headers.join(', ')}]`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rowsVal = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });
          // Filter out completely empty rows
          const filteredRows = rowsVal.filter(row => row.some(cell => cell !== ""));
          processParsedData(filteredRows);
        } catch (err) {
          setError("Failed to parse file: " + err.message);
        }
      };
      reader.onerror = () => setError("File reading failed.");
      reader.readAsArrayBuffer(file);
    } else {
      setError("Unsupported format. Please upload CSV or Excel files.");
    }
  };

  const handleBulkUpload = async () => {
    if (!parsedData || parsedData.length === 0) return;
    setLoading(true);
    setUploadProgress(0);
    try {
      await api.bulkVehicles(
        { vehicles: parsedData },
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      );
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.status === 207) {
        // Partial success (some duplicates ignored)
        onSuccess(err.response.data.message);
        onClose();
      } else {
        setError("Upload Failed: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="upload-modal">
        <div className="upload-header">
          <h2>Smart Excel Upload</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {!parsedData && (
          <div className="file-drop-area">
            <h3>Drag & Drop your CSV or Excel file here</h3>
            <p>or</p>
            <input type="file" accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} />
            {error && <p className="modal-error">{error}</p>}
          </div>
        )}

        {parsedData && (
          <>
            <p><strong>{parsedData.length}</strong> valid vehicles extracted. We auto-mapped your columns!</p>
            <div className="preview-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Vehicle No</th>
                    <th>Name</th>
                    <th>Vehicle Class</th>
                    <th>Mobile</th>
                    <th>Fitness</th>
                    <th>Tax</th>
                    <th>PUC</th>
                    <th>Permit</th>
                    <th>National</th>
                    <th>Insurance</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td>{row.vehicleNumber}</td>
                      <td>{row.fullName}</td>
                      <td>{row.vehicleClass}</td>
                      <td>{row.mobileNumber}</td>
                      <td>{row.fitnessExpiry}</td>
                      <td>{row.taxExpiry}</td>
                      <td>{row.pucExpiry}</td>
                      <td>{row.permitExpiry}</td>
                      <td>{row.nationalPermitExpiry}</td>
                      <td>{row.insuranceExpiry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 10 && <p>...and {parsedData.length - 10} more rows.</p>}
            
            {error && <p className="modal-error">{error}</p>}
            
            {loading && (
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}

            <div className="upload-actions">
              <button disabled={loading} className="nav-btn outline" onClick={() => setParsedData(null)}>Cancel</button>
              <button 
                className="upload-btn" 
                onClick={handleBulkUpload} 
                disabled={loading}
              >
                {loading ? `Uploading... ${uploadProgress}%` : `Upload ${parsedData.length} Vehicles`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExcelUploadModal;
