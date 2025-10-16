// client/src/component/Navbar/Navigation.js

import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav>
      <NavLink to="/home" className="header">
        <i className="fab fa-hive"></i> Home
      </NavLink>
      <ul className={open ? "navbar-links open" : "navbar-links"}>
        <li>
          <NavLink to="/voter" activeClassName="nav-active" onClick={() => setOpen(false)}>
            <i className="fas fa-vote-yea" /> Election Portal
          </NavLink>
        </li>
        <li>
          <NavLink to="/results" activeClassName="nav-active" onClick={() => setOpen(false)}>
            <i className="fas fa-poll-h" /> Full Results
          </NavLink>
        </li>
      </ul>
      <i onClick={() => setOpen(!open)} className="fas fa-bars burger-menu"></i>
    </nav>
  );
}