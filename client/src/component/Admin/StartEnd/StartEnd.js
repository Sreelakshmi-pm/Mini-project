import React, { Component } from "react";
import NavbarAdmin from "../../Navbar/NavigationAdmin";
import AdminOnly from "../../AdminOnly";
import getWeb3 from "../../../getWeb3";
import Election from "../../../contracts/Election.json";
import "../AdminPages.css"; //
export default class StartEnd extends Component {
  // ... (constructor, componentDidMount, start/end functions remain the same)
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      web3: null,
      accounts: null,
      isAdmin: false,
      elStarted: false,
      elEnded: false,
    };
  }

  componentDidMount = async () => {
    // refreshing page only once
    if (!window.location.hash) {
      window.location = window.location + "#loaded";
      window.location.reload();
    }

    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Election.networks[networkId];
      const instance = new web3.eth.Contract(
        Election.abi,
        deployedNetwork && deployedNetwork.address
      );
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({
        web3: web3,
        ElectionInstance: instance,
        account: accounts[0],
      });

      // Admin info
      const admin = await this.state.ElectionInstance.methods.getAdmin().call();
      if (this.state.account === admin) {
        this.setState({ isAdmin: true });
      }

      // Get election start and end values
      const start = await this.state.ElectionInstance.methods.getStart().call();
      this.setState({ elStarted: start });
      const end = await this.state.ElectionInstance.methods.getEnd().call();
      this.setState({ elEnded: end });
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

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
          <AdminOnly page="Start and end election page." />
        </>
      );
    }
    return (
      <>
        <NavbarAdmin />
        <div className="admin-page-container start-end-container">
          <h2>Election Control Panel</h2>

          {!this.state.elStarted && !this.state.elEnded ? (
            <button
              onClick={this.startElection}
              className="btn-primary"
              style={{ padding: "15px 30px", fontSize: "1.2rem" }}
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
              The election has ended. To start a new one, you must redeploy the
              contract.
            </p>
          )}

          <div className="election-status-panel">
            <h3>Current Status</h3>
            <p>Started: {this.state.elStarted ? "Yes" : "No"}</p>
            <p>Ended: {this.state.elEnded ? "Yes" : "No"}</p>
          </div>
        </div>
      </>
    );
  }
}
