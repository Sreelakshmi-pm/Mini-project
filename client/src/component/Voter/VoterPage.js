// client/src/component/Voter/VoterPage.js

import React, { Component } from "react";
import { Link } from "react-router-dom";
import getWeb3 from "../../getWeb3";
import Election from "../../contracts/Election.json";
import FaceCapture from "./FaceCapture";
import "./VoterPage.css";

const SERVER = "http://localhost:5000";

// ─── Helper: display winner ──────────────────────────────────────────────────
function displayWinner(candidates) {
  const getWinner = (candidates) => {
    let maxVoteReceived = 0;
    let winnerCandidates = [];
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].voteCount > maxVoteReceived) {
        maxVoteReceived = candidates[i].voteCount;
        winnerCandidates = [candidates[i]];
      } else if (candidates[i].voteCount === maxVoteReceived) {
        winnerCandidates.push(candidates[i]);
      }
    }
    return winnerCandidates;
  };
  const renderWinner = (winner) => (
    <div className="container-winner" key={winner.id}>
      <div className="winner-info">
        <p className="winner-tag">Winner!</p>
        <h2>{winner.header}</h2>
        <p className="winner-slogan">{winner.slogan}</p>
      </div>
      <div className="winner-votes">
        <div className="votes-tag">Total Votes:</div>
        <div className="vote-count">{winner.voteCount}</div>
      </div>
    </div>
  );
  return <>{getWinner(candidates).map(renderWinner)}</>;
}

// ────────────────────────────────────────────────────────────────────────────
export default class VoterPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      account: null,
      web3: null,
      candidates: [],
      isElStarted: false,
      isElEnded: false,
      currentVoter: {
        isRegistered: false,
        isVerified: false,
        hasVoted: false,
      },
      voterName: "",
      voterPhone: "",
      votedFor: localStorage.getItem("votedFor"),

      // ── Face-enrollment state (registration step) ──
      showFaceCapture: false, // show the camera modal
      faceEnrolled: false, // 5 photos captured & ready
      capturedDescriptors: [], // [[Float32Array]] from face-api

      // ── Face-verification state (voting step) ──
      faceVerified: false, // verified before voting
      storedDescriptors: null, // loaded from server
      verifyFailed: false, // timed out without match

      // ── OTP state ──
      sendingOTP: false,
      showOTPModal: false,
      otpInput: "",
    };
  }

  componentDidMount = async () => {
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

      const start = await instance.methods.getStart().call();
      const end = await instance.methods.getEnd().call();
      this.setState({ isElStarted: start, isElEnded: end });

      const voter = await instance.methods.voterDetails(accounts[0]).call();
      this.setState({
        currentVoter: {
          isRegistered: voter.isRegistered,
          isVerified: voter.isVerified,
          hasVoted: voter.hasVoted,
        },
      });

      if (start || end) {
        const candidateCount = await instance.methods
          .getTotalCandidate()
          .call();
        let candidates = [];
        for (let i = 0; i < candidateCount; i++) {
          const candidate = await instance.methods.candidateDetails(i).call();
          candidates.push({
            id: candidate.candidateId,
            header: candidate.header,
            slogan: candidate.slogan,
            voteCount: candidate.voteCount,
          });
        }
        this.setState({ candidates });
      }
    } catch (error) {
      alert("Failed to load. Check console for details.");
      console.error(error);
    }
  };

  updateVoterName = (e) => this.setState({ voterName: e.target.value });
  updateVoterPhone = (e) => this.setState({ voterPhone: e.target.value });

  handleLogout = () => {
    localStorage.removeItem("votedFor");
    localStorage.removeItem("voterEmail");
    alert("You have been logged out.");
    this.props.history.push("/login");
  };

  // ─── Step 1: voter fills in form → open camera for 5 photos ───────────────
  openFaceCapture = (e) => {
    e.preventDefault();
    this.setState({ showFaceCapture: true });
  };

  // ─── Called by FaceCapture after 5 descriptors collected ─────────────────
  onDescriptorsReady = (descriptors) => {
    this.setState({
      capturedDescriptors: descriptors,
      faceEnrolled: true,
      showFaceCapture: false,
    });
  };

  // ─── Step 2: register on blockchain + send descriptors to server ──────────
  registerAsVoter = async (e) => {
    e.preventDefault();
    const {
      account,
      voterName,
      voterPhone,
      capturedDescriptors,
      ElectionInstance,
    } = this.state;

    try {
      // 1. Save face descriptors to backend
      const res = await fetch(`${SERVER}/api/face/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account,
          descriptors: capturedDescriptors,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // 2. Register on blockchain
      await ElectionInstance.methods
        .registerAsVoter(voterName, voterPhone)
        .send({ from: account, gas: 1000000 });

      window.location.reload();
    } catch (err) {
      console.error("Registration error:", err);
      alert("Registration failed: " + err.message);
    }
  };

  // ─── Voting: load stored descriptors → show verify overlay ───────────────
  beginVoting = async () => {
    const { account } = this.state;
    try {
      const res = await fetch(`${SERVER}/api/face/${account}`);
      const data = await res.json();
      if (!data.success)
        throw new Error("No face data found. Please re-register.");
      this.setState({ storedDescriptors: data.descriptors }); // shows verify overlay
    } catch (err) {
      alert(err.message);
    }
  };

  onFaceVerified = async () => {
    this.setState({ faceVerified: true, storedDescriptors: null, sendingOTP: true });

    try {
      const email = localStorage.getItem("voterEmail");
      if (!email) throw new Error("Voter email not found in session. Please log in again.");

      const res = await fetch(`${SERVER}/api/voters/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      this.setState({ sendingOTP: false, showOTPModal: true });
    } catch (err) {
      console.error(err);
      alert("Error sending OTP: " + err.message);
      this.setState({ sendingOTP: false, faceVerified: false });
    }
  };

  verifyOTP = async (e) => {
    e.preventDefault();
    const { otpInput } = this.state;
    const email = localStorage.getItem("voterEmail");
    
    try {
      const res = await fetch(`${SERVER}/api/voters/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpInput }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert("✅ OTP Verification Successful. You may now cast your vote.");
        this.setState({ showOTPModal: false }); // unlocks the ballot
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error verifying OTP.");
    }
  };

  onVerifyFailed = () => {
    this.setState({ verifyFailed: true, storedDescriptors: null });
  };

  // ─── Cast vote (only reachable after faceVerified = true) ────────────────
  castVote = async (id, header) => {
    await this.state.ElectionInstance.methods
      .vote(id)
      .send({ from: this.state.account, gas: 1000000 });
    localStorage.setItem("votedFor", header);
    window.location.reload();
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  render() {
    if (!this.state.web3) {
      return (
        <nav className="voter-page-nav">
          <div className="voter-page-nav-left">eVoting Portal</div>
          <div className="voter-page-nav-right">
            <button onClick={this.handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </nav>
      );
    }

    const {
      isElStarted,
      isElEnded,
      currentVoter,
      showFaceCapture,
      faceEnrolled,
      capturedDescriptors,
      storedDescriptors,
      faceVerified,
      verifyFailed,
    } = this.state;

    // ── ELECTION ENDED ─────────────────────────────────────────────────────
    if (!isElStarted && isElEnded) {
      return (
        <div className="voter-page-container">
          <div className="voter-page-nav">Election Results</div>
          <div className="voter-page-content">
            <h2>The election has ended.</h2>
            {displayWinner(this.state.candidates)}
            <p style={{ marginTop: "20px" }}>
              <Link to="/results">View Full Results Breakdown</Link>
            </p>
          </div>
        </div>
      );
    }

    // ── ELECTION IN PROGRESS ───────────────────────────────────────────────
    if (isElStarted && !isElEnded) {
      // ── (a) NOT YET REGISTERED ──────────────────────────────────────────
      if (!currentVoter.isRegistered) {
        return (
          <div className="voter-page-container">
            {/* Face capture overlay */}
            {showFaceCapture && (
              <FaceCapture
                mode="enroll"
                onDescriptorsReady={this.onDescriptorsReady}
              />
            )}

            <div className="voter-page-nav">Voter Registration</div>
            <div className="voter-page-content">
              <h2>Register to Vote</h2>
              <p>
                Fill in your details, then capture{" "}
                <strong>5 face photos</strong> before registering.
              </p>
              <div className="registration-form">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={this.state.voterName}
                  onChange={this.updateVoterName}
                />
                <input
                  type="text"
                  placeholder="Your Phone Number (10 digits)"
                  value={this.state.voterPhone}
                  onChange={this.updateVoterPhone}
                />

                {/* Step 1: photo capture */}
                {!faceEnrolled ? (
                  <button
                    className="fc-action-btn"
                    onClick={this.openFaceCapture}
                    disabled={
                      this.state.voterName.trim() === "" ||
                      this.state.voterPhone.length !== 10
                    }
                  >
                    📷 Capture Face Photos ({capturedDescriptors.length}/5)
                  </button>
                ) : (
                  <p className="face-enrolled-msg">✅ Face photos captured!</p>
                )}

                {/* Step 2: register (only after photos done) */}
                <button
                  onClick={this.registerAsVoter}
                  disabled={!faceEnrolled}
                  className="fc-action-btn primary"
                >
                  ✔ Register
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ── (b) WAITING FOR ADMIN VERIFICATION ─────────────────────────────
      if (!currentVoter.isVerified) {
        return (
          <div className="voter-page-container">
            <div className="voter-page-nav">Registration Submitted</div>
            <div className="voter-page-content status-message">
              <h2>Thank You for Registering!</h2>
              <p>
                Your registration is pending approval from the election admin.
              </p>
            </div>
          </div>
        );
      }

      // ── (c) VERIFIED — READY TO VOTE ────────────────────────────────────
      if (!currentVoter.hasVoted) {
        // -- Face verification overlay (triggered by beginVoting) --
        if (storedDescriptors) {
          return (
            <div className="voter-page-container">
              <FaceCapture
                mode="verify"
                storedDescriptors={storedDescriptors}
                onVerified={this.onFaceVerified}
                onVerifyFailed={this.onVerifyFailed}
              />
              <div className="voter-page-nav">Identity Verification</div>
              <div className="voter-page-content status-message">
                <p>Verifying your identity before casting your vote…</p>
              </div>
            </div>
          );
        }

        // -- Verification failed state --
        if (verifyFailed) {
          return (
            <div className="voter-page-container">
              <div className="voter-page-nav">Verification Failed</div>
              <div className="voter-page-content status-message">
                <h2>❌ Identity Not Recognised</h2>
                <p>
                  Your face could not be verified. Please try again in good
                  lighting.
                </p>
                <button
                  className="fc-action-btn primary"
                  onClick={() => this.setState({ verifyFailed: false })}
                  style={{ marginTop: "1.5rem" }}
                >
                  Try Again
                </button>
              </div>
            </div>
          );
        }

        // -- Not yet started verification or already verified --
        return (
          <div className="voter-page-container">
            <div className="voter-page-nav">Cast Your Vote</div>
            <div className="voter-page-content">
              {!faceVerified ? (
                // Prompt to verify first
                <div
                  className="status-message"
                  style={{ marginBottom: "2rem" }}
                >
                  <h2>🔒 Identity Verification Required</h2>
                  <p>
                    Before voting, we need to verify your identity via your
                    camera.
                  </p>
                  <button
                    className="fc-action-btn primary"
                    onClick={this.beginVoting}
                    style={{ marginTop: "1.5rem" }}
                  >
                    🎥 Start Verification
                  </button>
                </div>
              ) : (
                // Verification passed — show OTP or ballot
                <>
                  {this.state.sendingOTP && (
                    <div className="status-message">
                      <p>Sending OTP to your registered email... Please wait.</p>
                      <br/>
                    </div>
                  )}

                  {this.state.showOTPModal && (
                    <div className="status-message" style={{ marginBottom: "2rem" }}>
                      <h2>📧 Enter OTP</h2>
                      <p>We've sent a 6-digit verification code to your email address.</p>
                      <form onSubmit={this.verifyOTP} style={{ marginTop: "1rem" }}>
                        <input
                          type="text"
                          maxLength="6"
                          placeholder="000000"
                          value={this.state.otpInput}
                          onChange={(e) => this.setState({ otpInput: e.target.value })}
                          style={{ padding: "10px", fontSize: "1.5rem", textAlign: "center", width: "150px", letterSpacing: "5px", borderRadius: "8px", border: "1px solid #ccc", background: "#f9f9f9", color: "#333", margin: "0 auto", display: "block" }}
                          required
                        />
                        <br />
                        <button type="submit" className="fc-action-btn primary" style={{ marginTop: "1.5rem" }}>
                          Verify OTP
                        </button>
                      </form>
                    </div>
                  )}

                  {!this.state.sendingOTP && !this.state.showOTPModal && (
                    <>
                      <div className="face-verified-banner">
                        ✅ Identity and Email verified — you may now vote
                      </div>
                      <h2>Candidates</h2>
                      <div className="candidate-list">
                    {this.state.candidates.map((candidate) => (
                      <div className="candidate-item" key={candidate.id}>
                        <h3>{candidate.header}</h3>
                        <p>{candidate.slogan}</p>
                        <button
                          onClick={() =>
                            this.castVote(candidate.id, candidate.header)
                          }
                        >
                          Vote
                        </button>
                      </div>
                    ))}
                  </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      }

      // ── (d) ALREADY VOTED ───────────────────────────────────────────────
      return (
        <div className="voter-page-container">
          <div className="voter-page-nav">Vote Cast</div>
          <div className="voter-page-content status-message">
            <h2>Your Vote has been Recorded!</h2>
            {this.state.votedFor && (
              <p>
                You voted for: <strong>{this.state.votedFor}</strong>
              </p>
            )}
            <p>Please wait for the results.</p>
          </div>
        </div>
      );
    }

    // ── ELECTION NOT STARTED YET ───────────────────────────────────────────
    return (
      <div className="voter-page-container">
        <nav className="voter-page-nav">
          <div className="voter-page-nav-left">eVoting Portal</div>
          <div className="voter-page-nav-right">
            <button onClick={this.handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </nav>
        <div className="voter-page-content status-message">
          <h2>The election has not started yet.</h2>
          <p>Please check back later.</p>
        </div>
      </div>
    );
  }
}
