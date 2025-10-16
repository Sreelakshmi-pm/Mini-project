// client/src/component/Navbar/NavigationAdmin.js

import React, { useState } from "react";
import { NavLink, useHistory } from "react-router-dom"; // <-- Import useHistory
import "./Navbar.css";

export default function NavbarAdmin() {
  const [open, setOpen] = useState(false);
  const history = useHistory(); // <-- Initialize history for redirection

  const handleLogout = () => {
    // In a real app, you would clear auth tokens here.
    // For this project, an alert and redirect is perfect.
    alert("You have been logged out.");
    history.push("/login");
  };

  return (
    <nav>
      <div className="header">
        <NavLink to="/home">
          <i className="fab fa-hive" /> Admin
        </NavLink>
      </div>
      <ul className={open ? "navbar-links open" : "navbar-links"}>
        <li>
          <NavLink to="/admindashboard" activeClassName="nav-active" onClick={() => setOpen(false)}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/Verification" activeClassName="nav-active" onClick={() => setOpen(false)}>
            Verification
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin" activeClassName="nav-active" onClick={() => setOpen(false)}>
            Add Candidate
          </NavLink>
        </li>
        <li>
          <NavLink to="/Registration" activeClassName="nav-active" onClick={() => setOpen(false)}>
            <i className="far fa-registered" /> Voter List
          </NavLink>
        </li>
        <li>
          <NavLink to="/Results" activeClassName="nav-active" onClick={() => setOpen(false)}>
            <i className="fas fa-poll-h" /> Results
          </NavLink>
        </li>
        {/* THIS IS THE NEW LOGOUT BUTTON */}
        <li>
          <button className="logout-btn-nav" onClick={handleLogout}>
            Logout
          </button>
        </li>
      </ul>
      <i onClick={() => setOpen(!open)} className="fas fa-bars burger-menu"></i>
    </nav>
  );
}