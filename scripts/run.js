const { utils } = require("ethers");

async function main() {
    const baseTokenURI = "ipfs://QmWBZFgy9exgpzJqoTub3YBv2oEY1XAXkbEkn3rpyp4oi9/";

    const provider = hre.ethers.provider

    // Get owner/deployer's wallet address
    const [owner] = await hre.ethers.getSigners();
    console.log("Owner address is:", owner.address);
    console.log("Owner balance is:", utils.formatEther(await provider.getBalance(owner.address)));

    // Get contract that we want to deploy
    const contractFactory = await hre.ethers.getContractFactory("DOUCollectible");

    // Deploy contract with the correct constructor arguments
    const contract = await contractFactory.deploy(baseTokenURI, "0xf57b2c51ded3a29e6891aba85459d600256cf317");

    // Wait for this transaction to be mined
    await contract.deployed();

    // Get contract address
    console.log("Contract deployed to:", contract.address);
    console.log("Contract balance is:", utils.formatEther(await provider.getBalance(contract.address)));

    // Mint 3 NFTs by sending 0.03 ether
    txn = await contract.publicMint(3, { value: utils.parseEther('0.03') });
    await txn.wait()
    console.log("Contract balance is:", utils.formatEther(await provider.getBalance(contract.address)));
    console.log("Owner balance is:", utils.formatEther(await provider.getBalance(owner.address)));

    // Get total supply minted
    let tokens = await contract.totalSupply()
    console.log("Total supply minted: ", tokens);

    filter = {
        address: contract.address,
        topics: [
            utils.id("Withdrawn(address, uint256)")
        ]
    }

    console.log("Contract owner is:" + await contract.owner());

    provider.on(filter, (event) => {
        console.log("test");
    })

    console.log("Owner due payments: " + await contract.payments(owner.address));

    txn = await contract.withdrawPayments(owner.address);
    await txn.wait()
    console.log("Withdrawn payments");
    console.log("Owner balance is:", utils.formatEther(await provider.getBalance(owner.address)));

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });