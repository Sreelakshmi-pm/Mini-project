// client/src/component/VoterSignup.js

import React, { useState } from "react";
import { useHistory, Link } from "react-router-dom"; // Added Link
import axios from "axios";
import "./AuthForm.css"; // <-- IMPORT THE NEW UNIFIED CSS

export default function VoterSignup() {
  const history = useHistory();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/api/voters/signup", form);
      if (response.data.success) {
        alert("Successfully Signed Up!");
        history.push("/login");
      } else {
        alert(response.data.message || "Signup failed.");
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container"> {/* <-- Use new class */}
      <div className="auth-box">       {/* <-- Use new class */}
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            name="name" 
            placeholder="Full Name" 
            value={form.name} 
            onChange={handleChange} 
            className="form-input" /* <-- Use global class */
            required 
          />
          <input 
            type="email" 
            name="email" 
            placeholder="Email" 
            value={form.email} 
            onChange={handleChange} 
            className="form-input" /* <-- Use global class */
            required 
          />
          <input 
            type="password" 
            name="password" 
            placeholder="Password" 
            value={form.password} 
            onChange={handleChange} 
            className="form-input" /* <-- Use global class */
            required 
          />
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary" /* <-- Use global class */
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}