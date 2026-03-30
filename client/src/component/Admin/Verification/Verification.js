// client/src/component/Admin/Verification/Verification.js

import React, { Component } from "react";
import NavbarAdmin from "../../Navbar/NavigationAdmin";
import AdminOnly from "../AdminOnly";
import getWeb3 from "../../../getWeb3";
import Election from "../../../contracts/Election.json";
import "../AdminPages.css";

const SERVER = "http://localhost:5000";

export default class Verification extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      account: null,
      web3: null,
      isAdmin: false,
      voters: [],
      showModal: false,
      selectedVoterDetails: null, // from backend
      currentVoterRecord: null, // from blockchain (selected row)
    };
  }

  componentDidMount = async () => {
    // Forcing a refresh once to avoid race condition issues
    if (!window.location.hash) {
      window.location = window.location + "#loaded";
      window.location.reload();
    }
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Election.networks[networkId];
      const instance = new web3.eth.Contract(
        Election.abi,
        deployedNetwork && deployedNetwork.address,
      );

      this.setState({ web3, ElectionInstance: instance, account: accounts[0] });

      // FIX #1: Added .toLowerCase() for robust admin check
      const admin = await instance.methods.getAdmin().call();
      if (accounts[0].toLowerCase() === admin.toLowerCase()) {
        this.setState({ isAdmin: true });
      }

      // Load all voters
      const voterCount = await instance.methods.getTotalVoter().call();
      let voters = [];
      for (let i = 0; i < voterCount; i++) {
        const voterAddress = await instance.methods.voters(i).call();
        const voter = await instance.methods.voterDetails(voterAddress).call();
        voters.push({
          address: voter.voterAddress,
          name: voter.name,
          phone: voter.phone,
          hasVoted: voter.hasVoted,
          isVerified: voter.isVerified,
          isRegistered: voter.isRegistered,
          isRejected: voter.isRejected,
        });
      }
      this.setState({ voters: voters });
    } catch (error) {
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  // FIX #2: verifyVoter is now a direct method of the class
  verifyVoter = async (voterAddress) => {
    await this.state.ElectionInstance.methods
      .verifyVoter(true, voterAddress)
      .send({ from: this.state.account, gas: 1000000 });
    window.location.reload();
  };

  // --- Fetch Face Details (ID photo & flagged status) for Review ---
  openReviewModal = async (voter) => {
    try {
      const res = await fetch(`${SERVER}/api/face/${voter.address}`);
      const data = await res.json();
      if (data.success) {
        this.setState({
          showModal: true,
          selectedVoterDetails: data,
          currentVoterRecord: voter,
        });
      } else {
        alert("No face/ID data found for this voter.");
      }
    } catch (err) {
      console.error("Error fetching voter details:", err);
      alert("Failed to fetch details from server.");
    }
  };

  closeModal = () => {
    this.setState({ showModal: false, selectedVoterDetails: null });
  };

  rejectVoter = async (voterAddress) => {
    const confirmReject = window.confirm(
      "Are you sure you want to REJECT this voter? This will deny their verification and clear their face data so they can try again.",
    );
    if (!confirmReject) return;

    try {
      // 1. Delete face data from backend
      await fetch(`${SERVER}/api/face/delete/${voterAddress}`, {
        method: "DELETE",
      });

      // 2. Set verification status to false on blockchain
      await this.state.ElectionInstance.methods
        .verifyVoter(false, voterAddress)
        .send({ from: this.state.account, gas: 1000000 });

      alert("Voter rejected and data cleared.");
      window.location.reload();
    } catch (err) {
      console.error("Rejection error:", err);
      alert("Failed to reject voter correctly.");
    }
  };

  // FIX #3: The old renderUnverifiedVoters function is now deleted
  // as all rendering logic is handled directly in the render() method.

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
          <AdminOnly page="Verification Page." />
        </>
      );
    }
    return (
      <>
        <NavbarAdmin />
        <div className="admin-page-container">
          <h2>Voter Verification</h2>
          <p style={{ textAlign: "center" }}>
            Total Voters Registered: {this.state.voters.length}
          </p>
          {this.state.voters.length < 1 ? (
            <p style={{ textAlign: "center" }}>No one has registered yet.</p>
          ) : (
            <table className="verification-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {this.state.voters.map((voter) => (
                  <tr key={voter.address}>
                    <td className="address-cell">{voter.address}</td>
                    <td>{voter.name}</td>
                    <td>{voter.phone}</td>
                    <td>{voter.isVerified ? "Verified" : (voter.isRejected ? "Rejected" : "Pending")}</td>
                    <td>
                      {voter.isVerified ? (
                        <span style={{ color: "green", fontWeight: "bold" }}>Approved</span>
                      ) : voter.isRejected ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          <span style={{ color: "red", fontWeight: "bold" }}>Rejected</span>
                          <button
                            className="btn-primary"
                            onClick={() => this.openReviewModal(voter)}
                            style={{ fontSize: "0.7rem", padding: "4px" }}
                          >
                            Re-Review
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-primary"
                          onClick={() => this.openReviewModal(voter)}
                        >
                          Review & Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* --- REVIEW MODAL --- */}
          {this.state.showModal && this.state.selectedVoterDetails && (
            <div className="modal-overlay">
              <div className={`modal-content ${this.state.selectedVoterDetails.isFlagged ? "wide" : ""}`}>
                <h3>Voter Identity Review</h3>
                <div style={{ textAlign: "left", marginBottom: "1rem" }}>
                  <p>
                    <strong>Name:</strong> {this.state.currentVoterRecord.name}
                  </p>
                  <p>
                    <strong>Phone:</strong> {this.state.currentVoterRecord.phone}
                  </p>
                  <p>
                    <strong>Address:</strong>{" "}
                    {this.state.currentVoterRecord.address}
                  </p>
                </div>

                <hr />

                {this.state.selectedVoterDetails.isFlagged && (
                  <div
                    className="warning-banner"
                    style={{
                      backgroundColor: "#ffe6e6",
                      color: "#cc0000",
                      padding: "10px",
                      borderRadius: "5px",
                      marginBottom: "1rem",
                      fontWeight: "bold",
                    }}
                  >
                    ⚠️ SIMILAR FACE DETECTED: This voter's face is very similar
                    to an existing record. Please check the ID carefully.
                  </div>
                )}

                <div className="photo-review-grid" style={{ display: "flex", gap: "15px", marginBottom: "1.5rem", overflowX: "auto" }}>
                  <div className="photo-column" style={{ flex: 1, minWidth: "150px" }}>
                    <p style={{ fontSize: "0.9rem", fontWeight: "bold" }}>1. Face Capture</p>
                    {this.state.selectedVoterDetails.facePhoto ? (
                      <img src={this.state.selectedVoterDetails.facePhoto} alt="Face" style={{ width: "100%", borderRadius: "5px", border: "1px solid #ddd" }} />
                    ) : (
                      <div style={{ height: "150px", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "5px", fontSize: "0.8rem", color: "#999" }}>No Photo</div>
                    )}
                  </div>
                  
                  <div className="photo-column" style={{ flex: 1, minWidth: "150px" }}>
                    <p style={{ fontSize: "0.9rem", fontWeight: "bold" }}>2. Gov ID Photo</p>
                    {this.state.selectedVoterDetails.idPhoto ? (
                      <img src={this.state.selectedVoterDetails.idPhoto} alt="ID" style={{ width: "100%", borderRadius: "5px", border: "1px solid #ddd" }} />
                    ) : (
                      <div style={{ height: "150px", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "5px", fontSize: "0.8rem", color: "#999" }}>No ID</div>
                    )}
                  </div>

                  {this.state.selectedVoterDetails.matchingDetails && (
                    <div className="photo-column" style={{ flex: 1, minWidth: "150px", border: "2px solid tomato", padding: "5px", borderRadius: "8px" }}>
                      <p style={{ fontSize: "0.9rem", fontWeight: "bold", color: "tomato" }}>3. MATCHING FACE</p>
                      <img src={this.state.selectedVoterDetails.matchingDetails.facePhoto} alt="Match" style={{ width: "100%", borderRadius: "5px" }} />
                      <p style={{ fontSize: "0.7rem", marginTop: "5px" }}>Wallet: {this.state.selectedVoterDetails.matchingDetails.walletAddress.substring(0,10)}...</p>
                    </div>
                  )}
                </div>

                <div
                  className="modal-actions"
                  style={{ marginTop: "2rem", display: "flex", gap: "10px" }}
                >
                  <button
                    className="btn-primary"
                    onClick={() =>
                      this.verifyVoter(this.state.currentVoterRecord.address)
                    }
                    style={{ flex: 1, backgroundColor: "#28a745" }}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() =>
                      this.rejectVoter(this.state.currentVoterRecord.address)
                    }
                    style={{ flex: 1, backgroundColor: "#dc3545" }}
                  >
                    Reject
                  </button>
                  <button
                    className="btn-primary"
                    onClick={this.closeModal}
                    style={{ flex: 1, backgroundColor: "#6c757d" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}
