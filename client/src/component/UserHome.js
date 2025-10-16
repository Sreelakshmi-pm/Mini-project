// client/src/component/UserHome.js

import React from "react";
import "./UserHome.css"; // We'll create this CSS file next

function UserHome(props) {
  // Destructure the properties from the 'el' prop for cleaner access
  const {
    electionTitle,
    organizationTitle,
    adminName,
    adminTitle,
    adminEmail,
  } = props.el;

  return (
    <div className="user-home-container info-card">
      <div className="title-section">
        <h1>{electionTitle}</h1>
        <h3>{organizationTitle}</h3>
      </div>
      <table className="details-table">
        <tbody>
          <tr>
            <th>Admin</th>
            <td>{adminName} ({adminTitle})</td>
          </tr>
          <tr>
            <th>Contact</th>
            <td>{adminEmail}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default UserHome;