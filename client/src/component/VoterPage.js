import React from "react";
import { Link, useHistory } from "react-router-dom";
import "./VoterPage.css";

export default function VoterPage() {
  const history = useHistory();

  const handleLogout = () => {
    localStorage.removeItem("voter"); // optional if you store login info
    alert("You have logged out!");
    history.push("/login");
  };

  const candidates = [
    { id: 1, name: "Candidate A", party: "Party X" },
    { id: 2, name: "Candidate B", party: "Party Y" },
    { id: 3, name: "Candidate C", party: "Party Z" },
  ];

  return (
    <div className="voter-container">
      {/* Navbar */}
      <nav className="voter-navbar">
        <div className="nav-left">Voting</div>
        <div className="nav-right">
          <Link to="/voter#candidates">Candidates</Link>
          <Link to="/results">Results</Link>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>

      {/* Candidate List */}
      <section id="candidates" className="candidates-section">
        <h2>List of Candidates</h2>
        <ul>
          {candidates.map((c) => (
            <li key={c.id}>
              <h3>{c.name}</h3>
              <p>{c.party}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Final Results */}
      <section id="results" className="results-section">
        <h2>Final Results</h2>
        <p>
          View the final voting results{" "}
          <Link to="/results" className="results-link">
            here
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
