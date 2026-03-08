// client/src/component/AdminDashboard.js

import React, { Component } from "react";
import { Link } from "react-router-dom";
import NavbarAdmin from "../Navbar/NavigationAdmin";
import AdminOnly from "./AdminOnly";
import getWeb3 from "../../getWeb3";
import Election from "../../contracts/Election.json";
import "./AdminPages.css"; // We can reuse the admin styling

const SERVER = "http://localhost:5000";

export default class AdminDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      web3: null,
      isAdmin: false,
      ElectionInstance: null,
      account: null,
      elStarted: false,
      elEnded: false,
      candidates: [],
      candidateCount: 0,
    };
  }

  componentDidMount = async () => {
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Election.networks[networkId];
      const instance = new web3.eth.Contract(
        Election.abi,
        deployedNetwork && deployedNetwork.address,
      );

      this.setState({
        web3: web3,
        ElectionInstance: instance,
        account: accounts[0],
      });

      // Check if the user is an admin
      const admin = await instance.methods.getAdmin().call();
      if (accounts[0].toLowerCase() === admin.toLowerCase()) {
        this.setState({ isAdmin: true });
      }

      // Get election status
      const start = await instance.methods.getStart().call();
      const end = await instance.methods.getEnd().call();
      this.setState({ elStarted: start, elEnded: end });

      // Get candidate information
      const candidateCount = await instance.methods.getTotalCandidate().call();
      this.setState({ candidateCount: candidateCount });

      let candidates = [];
      for (let i = 0; i < candidateCount; i++) {
        const candidate = await instance.methods.candidateDetails(i).call();
        candidates.push(candidate);
      }
      this.setState({ candidates: candidates });
    } catch (error) {
      console.error(error);
      alert(
        "Failed to load web3, accounts, or contract. Check console for details.",
      );
    }
  };

  // --- Functions to control the election ---
  startElection = async () => {
    await this.state.ElectionInstance.methods
      .startElection()
      .send({ from: this.state.account, gas: 1000000 });
    window.location.reload();
  };

  endElection = async () => {
    await this.state.ElectionInstance.methods
      .endElection()
      .send({ from: this.state.account, gas: 1000000 });
    window.location.reload();
  };

  resetFacesDatabase = async () => {
    const confirmReset = window.confirm(
      "WARNING: This will permanently delete ALL registered face data for this election. ONLY do this if you are starting a completely new election.\n\nAre you sure you want to proceed?",
    );

    if (confirmReset) {
      try {
        const response = await fetch(`${SERVER}/api/admin/reset-faces`, {
          method: "DELETE",
        });
        const data = await response.json();

        if (data.success) {
          alert("✅ Success: " + data.message);
        } else {
          alert("❌ Error: " + data.message);
        }
      } catch (err) {
        console.error("Error resetting faces:", err);
        alert("❌ Failed to connect to server to reset faces.");
      }
    }
  };

  render() {
    if (!this.state.web3) {
      return (
        <>
          <NavbarAdmin />
          <center>Loading Web3, accounts, and contract...</center>
        </>
      );
    }
    if (!this.state.isAdmin) {
      return (
        <>
          <NavbarAdmin />
          <AdminOnly page="Admin Dashboard" />
        </>
      );
    }

    return (
      <>
        <NavbarAdmin />
        <div className="admin-page-container">
          <h2>Election Control Panel</h2>

          {/* ELECTION CONTROL SECTION */}
          <div className="start-end-container" style={{ marginBottom: "2rem" }}>
            {!this.state.elStarted && !this.state.elEnded ? (
              <button
                onClick={this.startElection}
                className="btn-primary"
                style={{ padding: "15px 30px", fontSize: "1.2rem" }}
                disabled={this.state.candidates.length === 0} // Disable if no candidates
              >
                Start Election
              </button>
            ) : this.state.elStarted && !this.state.elEnded ? (
              <button
                onClick={this.endElection}
                className="btn-primary"
                style={{
                  backgroundColor: "tomato",
                  padding: "15px 30px",
                  fontSize: "1.2rem",
                }}
              >
                End Election
              </button>
            ) : (
              <p>
                The election has ended. To start a new one, you must redeploy
                the contract.
              </p>
            )}
          </div>

          <hr
            style={{ margin: "2rem 0", borderColor: "rgba(255,255,255,0.1)" }}
          />

          <div
            className="reset-faces-container"
            style={{ marginBottom: "2rem" }}
          >
            <h3>Danger Zone</h3>
            <p style={{ color: "gray", marginBottom: "1rem" }}>
              Only click this button when you are starting a brand new election
              and need to clear the old face database.
            </p>
            <button
              onClick={this.resetFacesDatabase}
              className="btn-primary"
              style={{
                backgroundColor: "darkred",
                border: "1px solid red",
                padding: "10px 20px",
                fontSize: "1rem",
              }}
            >
              🗑️ Reset Faces Database
            </button>
          </div>

          {/* CANDIDATE LIST SECTION */}
          <div className="info-card">
            <h3>Current Candidates ({this.state.candidateCount})</h3>
            {this.state.candidates.length === 0 ? (
              <p>
                No candidates have been added yet. Please{" "}
                <Link to="/admin">add candidates</Link> before starting the
                election.
              </p>
            ) : (
              <table className="verification-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name / Header</th>
                    <th>Slogan</th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.candidates.map((candidate) => (
                    <tr key={candidate.candidateId}>
                      <td>{candidate.candidateId}</td>
                      <td>{candidate.header}</td>
                      <td>{candidate.slogan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ELECTION STATUS PANEL */}
          <div className="election-status-panel" style={{ marginTop: "2rem" }}>
            <h3>Current Status</h3>
            <p>Started: {this.state.elStarted ? "Yes" : "No"}</p>
            <p>Ended: {this.state.elEnded ? "Yes" : "No"}</p>
          </div>
        </div>
      </>
    );
  }
}
