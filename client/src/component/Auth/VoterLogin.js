// client/src/component/VoterLogin.js

import React, { useState } from "react";
import axios from "axios";
import { useHistory, Link } from "react-router-dom"; // Added Link
import "./AuthForm.css"; // <-- IMPORT THE NEW UNIFIED CSS

function VoterLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const history = useHistory();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/voters/login", {
        email,
        password,
      });

      if (res.data.success) {
        alert(res.data.message);
        if (res.data.role === "admin") {
          history.push("/home"); // Redirect admin to home dashboard
        } else if (res.data.role === "voter") {
          history.push("/voter"); // Redirect voter to home dashboard
        }
      } else {
        alert(res.data.message);
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert(error.response?.data?.message || "Login failed.");
    }
  };

  return (
    <div className="auth-container">
      {" "}
      {/* <-- Use new class */}
      <div className="auth-box">
        {" "}
        {/* <-- Use new class */}
        <h2>Voter Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input" /* <-- Use global class */
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input" /* <-- Use global class */
            required
          />
          <button
            type="submit"
            className="btn-primary" /* <-- Use global class */
            style={{ width: "100%", marginTop: "1rem" }}
          >
            Login
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>
      </div>
    </div>
  );
}

export default VoterLogin;
