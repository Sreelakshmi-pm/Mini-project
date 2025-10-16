// client/src/getWeb3.js

import Web3 from "web3";

const getWeb3 = async () => {
  // Modern dapp browsers...
  if (window.ethereum) {
    const web3 = new Web3(window.ethereum);
    try {
      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });
      return web3;
    } catch (error) {
      throw new Error("User denied account access");
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
    const web3 = window.web3;
    console.log("Injected web3 detected.");
    return web3;
  }
  // Fallback to localhost
  else {
    const provider = new Web3.providers.HttpProvider(
      "http://12.0.0.1:8545" // Or your Ganache port
    );
    const web3 = new Web3(provider);
    console.log("No web3 instance injected, using Local web3.");
    return web3;
  }
};

export default getWeb3;