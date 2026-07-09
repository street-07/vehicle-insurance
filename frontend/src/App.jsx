import React, { useContext } from "react";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import { AuthContext } from "./context/AuthContext";

import GhostProtocol from "./components/GhostProtocol";

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'Lastica, sans-serif' }}>Loading Identity...</div>;
  }

  return (
    <div className="app">
      {user ? (
        <GhostProtocol user={user}>
          <Home />
        </GhostProtocol>
      ) : (
        <AuthPage />
      )}
    </div>
  );
}

export default App;
