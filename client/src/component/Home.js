// client/src/component/Home.js

import React, { Component } from "react";
import Navbar from "./Navbar/Navigation";
import getWeb3 from "../getWeb3";
import Election from "../contracts/Election.json";
import "./Home.css";

export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // We only need the account state here initially
      account: null,
    };
  }

  // We leave componentDidMount empty to prevent automatic connection
  componentDidMount = async () => {
    //
  };

  // This function will connect, check the role, and then redirect.
  connectWalletAndRedirect = async () => {
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Election.networks[networkId];
      const instance = new web3.eth.Contract(
        Election.abi,
        deployedNetwork && deployedNetwork.address,
      );

      const account = accounts[0];
      const admin = await instance.methods.getAdmin().call();

      // Check the role and redirect
      if (account.toLowerCase() === admin.toLowerCase()) {
        // If user is ADMIN, redirect to the Admin Dashboard
        this.props.history.push("/admindashboard");
      } else {
        // If user is a VOTER, redirect to the Voter Page
        this.props.history.push("/voter");
      }
    } catch (error) {
      alert(
        `Failed to connect to wallet. Make sure you are on the correct network.`,
      );
      console.error(error);
    }
  };

  render() {
    // This component will now ONLY show the "Connect Wallet" screen.
    // Once connected, it will redirect away, so it never needs to render anything else.
    return (
      <>
        <Navbar />
        <div className="home-page-container">
          <div style={{ textAlign: "center" }}>
            <h2>Welcome to the Election Portal</h2>
            <p>Please connect your wallet to proceed to your dashboard.</p>
            <button
              onClick={this.connectWalletAndRedirect}
              className="btn-primary"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </>
    );
  }
}
