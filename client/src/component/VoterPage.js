// client/src/component/VoterPage.js

import React, { Component } from "react";
import { Link } from "react-router-dom";
import getWeb3 from "../getWeb3";
import Election from "../contracts/Election.json";
import "./VoterPage.css";

// This function to display the winner remains the same
function displayWinner(candidates) {
  // ... (this function is identical to the previous version)
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
    <div className="container-winner">
      <div className="winner-info">
        <p className="winner-tag">Winner!</p>
        <h2>{winner.header}</h2>
        <p className="winner-slogan">{winner.slogan}</p>
      </div>
      <div className="winner-votes">
        <div className="votes-tag">Total Votes: </div>
        <div className="vote-count">{winner.voteCount}</div>
      </div>
    </div>
  );

  const winnerCandidates = getWinner(candidates);
  return <>{winnerCandidates.map(renderWinner)}</>;
}

export default class VoterPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // All the state from before
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
        deployedNetwork && deployedNetwork.address
      );

      this.setState({ web3, ElectionInstance: instance, account: accounts[0] });

      const start = await instance.methods.getStart().call();
      const end = await instance.methods.getEnd().call();
      this.setState({ isElStarted: start, isElEnded: end });

      // ---- NEW FEATURE: ONE-MINUTE TIMER FOR RESULTS ----
      // If the election has ended, start a tim
      // ---- END OF NEW FEATURE ----

      const voter = await instance.methods.voterDetails(accounts[0]).call();
      this.setState({
        currentVoter: {
          isRegistered: voter.isRegistered,
          isVerified: voter.isVerified,
          hasVoted: voter.hasVoted,
        },
      });

      if (start || end) {
        // Load candidates if election started or ended
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
      alert(`Failed to load. Check console for details.`);
      console.error(error);
    }
  };

  // All the other functions (register, vote, etc.) remain the same
  updateVoterName = (event) => this.setState({ voterName: event.target.value });
  updateVoterPhone = (event) =>
    this.setState({ voterPhone: event.target.value });

  registerAsVoter = async () => {
    await this.state.ElectionInstance.methods
      .registerAsVoter(this.state.voterName, this.state.voterPhone)
      .send({ from: this.state.account, gas: 1000000 });
    window.location.reload();
  };

  castVote = async (id, header) => {
    await this.state.ElectionInstance.methods
      .vote(id)
      .send({ from: this.state.account, gas: 1000000 });
    localStorage.setItem("votedFor", header);
    window.location.reload();
  };

  // client/src/component/VoterPage.js

  // Add this new function inside the class
  handleLogout = () => {
    // Clear any potential session data from browser storage
    localStorage.removeItem("votedFor");

    alert("You have been logged out.");

    // Redirect to the login page
    this.props.history.push("/login");
  };
  render() {
    if (!this.state.web3) {
      return (
        // This is the NEW navbar code with the logout button
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

    const { isElStarted, isElEnded, currentVoter } = this.state;

    // ---- BUG FIX: IMPROVED LOGIC FOR DISPLAYING STAGES ----
    // This new if/else structure correctly handles all election states.

    // ELECTION ENDED
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

    // ELECTION IN PROGRESS
    if (isElStarted && !isElEnded) {
      if (!currentVoter.isRegistered) {
        return (
          <div className="voter-page-container">
            {/* ... Registration form ... */}
            <div className="voter-page-nav">Voter Registration</div>
            <div className="voter-page-content">
              <h2>Register to Vote</h2>
              <p>Please provide your details to participate in the election.</p>
              <div className="registration-form">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={this.state.voterName}
                  onChange={this.updateVoterName}
                />
                <input
                  type="text"
                  placeholder="Your Phone Number"
                  value={this.state.voterPhone}
                  onChange={this.updateVoterPhone}
                />
                <button onClick={this.registerAsVoter}>Register</button>
              </div>
            </div>
          </div>
        );
      }
      if (!currentVoter.isVerified) {
        return (
          <div className="voter-page-container">
            {/* ... Waiting for verification ... */}
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
      if (!currentVoter.hasVoted) {
        return (
          <div className="voter-page-container">
            {/* ... Voting interface ... */}
            <div className="voter-page-nav">Cast Your Vote</div>
            <div className="voter-page-content">
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
            </div>
          </div>
        );
      }
      // Already voted
      return (
        <div className="voter-page-container">
          {/* ... Already voted message ... */}
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

    // ELECTION NOT STARTED YET
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
