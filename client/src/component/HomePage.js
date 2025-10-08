import React from "react";
import { useHistory } from "react-router-dom";
import "./HomePage.css";

export default function HomePage() {
  const history = useHistory();

  return (
    <div className="home-container">
      <div className="home-left">
        <h1>Welcome to Blockchain Based eVoting System</h1>
        <div className="buttons">
          <button onClick={() => history.push("/signup")} className="btn signup">
            Sign Up
          </button>
          <button onClick={() => history.push("/login")} className="btn login">
            Login
          </button>
        </div>
      </div>
      <div className="home-right"></div>
    </div>
  );
}
