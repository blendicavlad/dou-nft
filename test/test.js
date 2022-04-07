const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
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

describe("Minting", function () {
  it("Should test for minting 1 piece", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    const [owner] = await hre.ethers.getSigners();

    await contract.deployed();
    // Mint 1 NFT by sending 0.1 ether
    expect(contract.publicMint(1, ethers.constants.AddressZero, { value: utils.parseEther('0.1') }))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, 21 - 1); //Token indexes start at 0
    let tokens = await contract.totalSupply()
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 1)
  });

  it("Should test for minting 1000 pieces in batch", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    const [owner] = await hre.ethers.getSigners();

    await contract.deployed();
    // Mint 1000 NFT by sending 10 ether
    expect(contract.publicMint(1000, ethers.constants.AddressZero, { value: utils.parseEther('100') }))      
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, MINTED_ON_DEPLOYMENT + 1000 - 1);; //Token indexes start at 0 
    let tokens = await contract.totalSupply();
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 1000);
  });

  it("Should test for minting 100 pieces separately", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    await contract.deployed();
    // Mint 100 NFT by sending 1 ether

    const signers = await hre.ethers.getSigners();
    for (i = 0; i < 100; i++) {
      await contract.connect(signers[i]).publicMint(1, ethers.constants.AddressZero, { value: utils.parseEther('0.1') });
    }
    let tokens = await contract.totalSupply();
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 100);
    for (i = 0; i < 100; i++) {
      expected = i == 0 ? 21 : 1; //owner should have 21
      expect(await contract.balanceOf(signers[i].address)).to.equal(expected);
    }
  });

  it("Should test reverts", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    await contract.deployed();

    const [owner] = await hre.ethers.getSigners();

    await expect(contract.publicMint(-1000, ethers.constants.AddressZero, { value: utils.parseEther('0.1') }))
      .to.be.reverted;

    await expect(contract.publicMint(1, ethers.constants.AddressZero, { value: utils.parseEther('-0.1') }))
      .to.be.reverted;

    await expect(contract.publicMint(0, ethers.constants.AddressZero, { value: utils.parseEther('0') }))
      .to.be.reverted;

    await expect(contract.publicMint(2, ethers.constants.AddressZero, { value: utils.parseEther('0.1') }))
      .to.be.revertedWith('Wrong amount of Ether sent, you should send: 200000000000000000 Wei');

    await expect(contract.publicMint(10001, ethers.constants.AddressZero, { value: utils.parseEther('1000.1') }))
      .to.be.revertedWith('Can not mint that many');

    txn = await contract.disableMinting()
    await txn.wait()

    await expect(contract.publicMint(1, ethers.constants.AddressZero, { value: utils.parseEther('0.1') }))
    .to.be.revertedWith("Minting not enabled");
  })
});


describe("Contract state write", function () {
  it("Should test minting enabling/disabling functionality", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

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


describe("Referrals", function () {
  it("Should test for referral to different user", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    const [owner, owner2] = await hre.ethers.getSigners();

    await contract.deployed();
    // Mint 1 NFT by sending 0.1 ether
    expect(contract.publicMint(1, ethers.constants.AddressZero, { value: utils.parseEther('0.1') }))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, 21 - 1);
    let tokens = await contract.totalSupply()
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 1);

    // Mint 1 NFT with refferal code by sending 0.09 ether
    expect(contract.publicMint(1, owner2.address, { value: utils.parseEther('0.09') }))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, 22 - 1);
    tokens = await contract.totalSupply()
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 2);
  });

  it("Should test for referral to same user", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    const [owner] = await hre.ethers.getSigners();

    await contract.deployed();
    // Mint 1 NFT by sending 0.1 ether
    expect(contract.publicMint(1, ethers.constants.AddressZero, { value: utils.parseEther('0.1') }))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, 21 - 1);
    let tokens = await contract.totalSupply()
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 1);

    // Mint 1 NFT with refferal code by sending 0.09 ether
    expect(contract.publicMint(1, owner.address, { value: utils.parseEther('0.09') }))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, 22 - 1);
    tokens = await contract.totalSupply()
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 2);
  });

  it("Should test for minting entire collection using refferal", async function () {
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    const [owner] = await hre.ethers.getSigners();

    await contract.deployed();
    // Mint 1 NFT by sending 0.1 ether
    expect(contract.publicMint(1, ethers.constants.AddressZero, { value: utils.parseEther('0.1') }))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, 21 - 1);
    let tokens = await contract.totalSupply()
    expect(tokens).to.equal(MINTED_ON_DEPLOYMENT + 1);

    // Mint 9979 NFT with refferal code by sending 898.11 ether ()
    expect(contract.publicMint(9979, owner.address, { value: utils.parseEther('898.11') }))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, 22 - 1);
    tokens = await contract.totalSupply()
    expect(tokens).to.equal(10000);
  });
});


describe("Withtdrawal", function () {
  it("Should test withdrawal", async function () {

    getTxCost = async (txHash) => {
      let receipt = await ethers.provider.getTransactionReceipt(txHash);
      return receipt.effectiveGasPrice.mul(receipt.gasUsed);
    };

    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    const [owner, user2] = await hre.ethers.getSigners();

    await contract.deployed();

    const oldOwnerBalance = await provider.getBalance(owner.address);

    mintTxn = await contract.connect(user2).publicMint(3, ethers.constants.AddressZero, { value: utils.parseEther('0.3') })
    mintTxn.wait();

    //Test withdrawal will fail if initiated by a non-owner address
    await expect(contract.connect(user2).withdrawPayments(user2.address))
      .to.be.revertedWith('Ownable: caller is not the owner');

    await expect(await contract.connect(owner).withdrawPayments(owner.address))
      .to.changeEtherBalance(owner, utils.parseEther('0.3'));
  });
});