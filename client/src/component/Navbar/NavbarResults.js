// client/src/component/Navbar/NavbarResults.js

import React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

export default function NavbarResults() {
  return (
    <nav>
      <NavLink to="/home" className="header">
        <i className="fab fa-hive"></i> Home
      </NavLink>
      <ul className="navbar-links">
        <li>
          {/* This link is highlighted as it points to the current page */}
          <NavLink to="/Results" activeClassName="nav-active">
            <i className="fas fa-poll-h" /> Election Results
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}