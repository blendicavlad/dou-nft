const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { utils } = require("ethers");
const { solidity } = require("ethereum-waffle");

const baseTokenURI = "ipfs://QmWBZFgy9exgpzJqoTub3YBv2oEY1XAXkbEkn3rpyp4oi9/";

const provider = hre.ethers.provider
const MINTED_ON_DEPLOYMENT = 20


describe("Deployment", function () {
  it("Should test for contract deployment", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    // Wait for this transaction to be mined
    await contract.deployed();
    expect(contract.address).to.equal("0x5FbDB2315678afecb367f032d93F642f64180aa3")
  });
});

describe("Single mint", function () {
  it("Should test for minting 1 piece", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    const [owner] = await hre.ethers.getSigners();
    // Wait for this transaction to be mined
    await contract.deployed();
    // Mint 1 NFT by sending 0.03 ether
    expect(contract.publicMint(1, { value: utils.parseEther('0.01') }))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, 20);
    let tokens = await contract.totalSupply()
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 1)
  });
});

describe("Batch multiple mint", function () {
  it("Should test for minting 100 pieces in batch", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    // Wait for this transaction to be mined
    await contract.deployed();
    // Mint 100 NFT by sending 1 ether
    await contract.publicMint(1000, { value: utils.parseEther('10') });
    let tokens = await contract.totalSupply();
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 1000);
  });
});

describe("Multiple mint", function () {
  it("Should test for minting 100 pieces separately", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");
    // Wait for this transaction to be mined
    await contract.deployed();
    // Mint 100 NFT by sending 1 ether

    const wallets = [];
    for (i = 0; i < 100; i++) {
      const wallet = ethers.Wallet.createRandom();
      wallets[i] = wallet;
      contractFactory.connect(wallet)
      await contract.publicMint(1, { value: utils.parseEther('0.01') });
    }
    let tokens = await contract.totalSupply();
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 100);
  });
});


describe("Multiple mint", function () {
  it("Should test for minting 100 pieces separately", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");
    // Wait for this transaction to be mined
    await contract.deployed();
    // Mint 100 NFT by sending 1 ether

    const wallets = [];
    for (i = 0; i < 100; i++) {
      const wallet = ethers.Wallet.createRandom();
      wallets[i] = wallet;
      contractFactory.connect(wallet)
      await contract.publicMint(1, { value: utils.parseEther('0.01') });
    }
    let tokens = await contract.totalSupply();
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 100);
  });
});

describe("Enable/Disable mint", function () {
  it("Should test minting enabling/disabling functionality", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");
    // Wait for this transaction to be mined
    await contract.deployed();

    expect(await contract.mintStatus()).to.equal(true)

    txn = await contract.disableMinting()
    await txn.wait()

    expect(await contract.mintStatus()).to.equal(false)

    txn = await contract.enableMinting()
    await txn.wait()

    expect(await contract.mintStatus()).to.equal(true)

    let tokens = await contract.totalSupply();
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT);
  });
});