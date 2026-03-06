// client/src/component/StartEnd.js

import React from "react";
import { Link } from "react-router-dom";
import "../Shared/DashboardControls.css"; // <-- IMPORT THE NEW CSS

const StartEnd = (props) => {
  return (
    <div className="controls-container">
      {!props.elStarted ? (
        <>
          {!props.elEnded ? (
            <>
              <div className="info-box">
                <h2>Don't Forget to Add Candidates!</h2>
                <p>
                  Go to the <Link to="/admin">Add Candidates</Link> page before
                  starting the election.
                </p>
              </div>
              <div className="action-button-container">
                {/* Note: The form submission is handled by Home.js */}
                <button type="submit" className="btn-primary">
                  Start Election
                </button>
              </div>
            </>
          ) : (
            <div className="info-box">
              <p>
                The election has ended. Please re-deploy the contract to start a
                new election.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="action-button-container">
          <button
            type="button"
            onClick={props.endElFn}
            className="btn-primary btn-end-election" /* Uses both classes */
          >
            End Election
          </button>
        </div>
      )}
    </div>
  );
};

export default StartEnd;
