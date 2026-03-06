// client/src/component/Admin/Verification/Verification.js

import React, { Component } from "react";
import NavbarAdmin from "../../Navbar/NavigationAdmin";
import AdminOnly from "../AdminOnly";
import getWeb3 from "../../../getWeb3";
import Election from "../../../contracts/Election.json";
import "../AdminPages.css";

export default class Verification extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      account: null,
      web3: null,
      isAdmin: false,
      voters: [],
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
                    <td>{voter.isVerified ? "Verified" : "Not Verified"}</td>
                    <td>
                      {!voter.isVerified && (
                        <button
                          className="btn-primary"
                          onClick={() => this.verifyVoter(voter.address)} // This now correctly calls the class method
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  }
}
