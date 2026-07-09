import React from "react";
import Navbar from "../components/Navbar";
import VehicleList from "../components/VehicleList";
import Footer from "../components/Footer";

const Home = () => {
  return (
    <>
      <Navbar />
      <main style={{ flex: 1 }}>
        <VehicleList />
      </main>
      <Footer />
    </>
  );
};

export default Home;
