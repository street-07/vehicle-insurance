import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/theme.css";
import { VehicleProvider } from "./context/VehicleContext.jsx";

import { AuthProvider } from "./context/AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <VehicleProvider>
        <App />
      </VehicleProvider>
    </AuthProvider>
  </React.StrictMode>
);
