// client/src/component/NotInit.js

import React from "react";
import "./StatusMessage.css"; // <-- IMPORT THE NEW CSS

const NotInit = () => {
  return (
    // Replace the old structure with this single, styled container
    <div className="status-message-container">
      <h3>The election has not been initialized.</h3>
      <p>Please wait for the admin to set up the election.</p>
    </div>
  );
};

export default NotInit;
