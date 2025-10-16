// client/src/component/ElectionStatus.js

import React from "react";
import "./DashboardControls.css"; // <-- IMPORT THE NEW CSS

const ElectionStatus = (props) => {
  return (
    <div className="status-panel">
      <h3>Election Status</h3>
      <div className="status-display">
        <p>Started: <strong>{props.elStarted ? "Yes" : "No"}</strong></p>
        <p>Ended: <strong>{props.elEnded ? "Yes" : "No"}</strong></p>
      </div>
    </div>
  );
};

export default ElectionStatus;