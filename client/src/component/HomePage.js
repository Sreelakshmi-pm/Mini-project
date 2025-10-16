// client/src/component/HomePage.js

import React from "react";
import { useHistory } from "react-router-dom";
import "./HomePage.css";

export default function HomePage() {
  const history = useHistory();

  return (
    <div className="home-container">
      <div className="home-left">
        {/* I've added a more descriptive header and a paragraph */}
        <h1>A Secure, Transparent, and Modern Way to Vote</h1>
        <p>
          Leveraging the power of the blockchain to ensure the integrity and
          fairness of every election.
        </p>
        <div className="buttons-container">
          {/* Apply the new global button classes */ }
          <button
            onClick={() => history.push("/signup")}
            className="btn-primary" /* This uses the ORANGE button from App.css */
          >
            Sign Up
          </button>
          <button
            onClick={() => history.push("/login")}
            className="btn-secondary" /* This uses the new BLUE button */
          >
            Login
          </button>
        </div>
      </div>
      <div className="home-right"></div>
    </div>
  );
}