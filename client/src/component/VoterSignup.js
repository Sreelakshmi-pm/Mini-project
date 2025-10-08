import React, { useState } from "react";
import { useHistory } from "react-router-dom"; // v5 hook
import axios from "axios";
import "./VoterSignup.css";

export default function VoterSignup() {
  const history = useHistory(); // useHistory instead of useNavigate
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
        history.push("/login"); // redirect to login page
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
    <div className="signup-container">
      <div className="signup-box">
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          <button type="submit" disabled={loading}>{loading ? "Signing Up..." : "Sign Up"}</button>
        </form>
      </div>
    </div>
  );
}
