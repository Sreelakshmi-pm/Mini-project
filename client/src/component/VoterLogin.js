import React, { useState } from "react";
import { useHistory } from "react-router-dom"; // v5 hook
import axios from "axios";
import "./VoterLogin.css";

export default function VoterLogin() {
  const history = useHistory();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/api/voters/login", form);
      if (response.data.success) {
        alert("Login Successful!");
        history.push("/voter"); // redirect to Home component
      } else {
        alert(response.data.message || "Invalid email or password.");
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          <button type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        </form>
      </div>
    </div>
  );
}
