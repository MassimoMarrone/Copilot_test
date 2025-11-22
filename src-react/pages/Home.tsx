import React from "react";
import { useOutletContext } from "react-router-dom";
import LandingPage from "../components/LandingPage";
import { useAuth } from "../context/AuthContext";

interface OutletContextType {
  openLogin: () => void;
  openRegister: () => void;
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const { openLogin, openRegister } = useOutletContext<OutletContextType>();

  return (
    <>
      <LandingPage
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
        user={user}
      />
    </>
  );
};

export default Home;
