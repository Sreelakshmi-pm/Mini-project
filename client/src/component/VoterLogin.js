// VoterLogin.js
import React, { useState } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom"; // ✅ useHistory

function VoterLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const history = useHistory(); // initialize history

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:5000/api/voters/login", {
        email,
        password,
      });

      if (res.data.success) {
        alert(res.data.message);

        // Redirect based on role
        if (res.data.role === "admin") {
          history.push("/admin"); // ✅ admin page
        } else if (res.data.role === "voter") {
          history.push("/voter"); // ✅ voter page
        } else {
          alert("Unknown role. Cannot redirect.");
        }
      } else {
        alert(res.data.message); // invalid credentials
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <h2>Voter Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default VoterLogin;
