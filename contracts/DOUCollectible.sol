//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./erc/721/ERC721A.sol";
import "./eip/2981/ERC2981Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";

/**
    DEFENDERS OF UKRAINE CHARITY NFT
    10.000 COLLECTION SIZE
    0.01 MINTING PRICE
    NO RESTRINCTION ON AMOUNT BOUGHT BY AN ADDRESS
 */

contract OwnableDelegateProxy {}

/**
 * Used to delegate ownership of a contract to another address, to save on unneeded transactions to approve contract use for users
 */
contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract DOUCollectible is
    ERC721A,
    ERC2981Royality,
    Ownable,
    PullPayment
{
    string private baseURI;
    address public immutable proxyRegistryAddress;

    uint256 private constant mintPrice = 0.01 ether; //todo: to revise price
    uint256 private constant mintSize = 10_000;

    bool private mintingActive = true;

    //todo: see if we can get already minted nfts, and nfts of some particular user (maybe ERC721Collectible?)

    event UpdatedMintStatus(bool _old, bool _new);
    event FallbackPaymentReceived(address _from, uint256 _value);

    constructor(string memory _baseTokenURI, address _proxyRegistryAddress) ERC721A("Defenders of Ukraine", "DOU") {
        baseURI = _baseTokenURI;
        proxyRegistryAddress = _proxyRegistryAddress;
        reserveNFTs();
    }

    /** MINTING */

    // @notice: enables minting
    function enableMinting() external onlyOwner {
        bool old = mintingActive;
        mintingActive = true;
        emit UpdatedMintStatus(old, mintingActive);
    }

    // @notice: disables minting
    function disableMinting() external onlyOwner {
        bool old = mintingActive;
        mintingActive = false;
        emit UpdatedMintStatus(old, mintingActive);
    }

    // @notice: reserves minting
    // reserve 10 for VIP offering and 10 for initial OpenSea pre sale
    function reserveNFTs() public onlyOwner {
        require(totalSupply() + 20 <= mintSize, "Can not mint that many");
        _mint(owner(), 20, "", false);
    }

    function publicMint(uint256 amount) external payable {
        require(mintingActive, "Minting not enabled");
        require(
            msg.value == mintPrice * amount,
            "Wrong amount of Native Token"
        );
        require(totalSupply() + amount <= mintSize, "Can not mint that many");
        _asyncTransfer(owner(), msg.value);
        _mint(_msgSender(), amount, "", false);
    }

    /** PAYMENTS */

    // @notice: withdraw funds from contract
    function withdrawPayments(address payable payee)
        public
        virtual
        override
        onlyOwner
    {
        super.withdrawPayments(payee);
    }

    // @notice: ERC2981 royalty info implementation
    function setRoyaltyInfo(address _royaltyAddress, uint256 _percentage)
        public
        onlyOwner
    {
        _setRoyalties(_royaltyAddress, _percentage);
    }

    // @notice recieve function
    receive() external payable {
        // From PaymentSplitter.sol
        _asyncTransfer(owner(), msg.value);
        emit FallbackPaymentReceived(_msgSender(), msg.value);
    }

    // @notice fallback function
    fallback() external payable {
        // From PaymentSplitter.sol
        _asyncTransfer(owner(), msg.value);
        emit FallbackPaymentReceived(_msgSender(), msg.value);
    }

    /** VIEWS */

    // @notice will return whether minting is enabled
    function mintStatus() external view returns (bool) {
        return mintingActive;
    }

    // @notice will return minting fees
    function mintingFee() external pure returns (uint256) {
        return mintPrice;
    }

    // @notice this is a public getter for ETH balance on contract
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // @notice will return the planned size of the collection
    function collectionSize() external pure returns (uint256) {
        return mintSize;
    }

    /** IMPLEMENTATIONS */

    // @notice Solidity required override for _baseURI(), if you wish to
    //  be able to set from API -> IPFS or vice versa using setBaseURI(string)
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory _baseTokenURI) public onlyOwner {
        baseURI = _baseTokenURI;
    }


    // @notice Override for ERC721A tokenURI
    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(_tokenId), "Token does not exist");
        string memory _baseTokenURI = _baseURI();
        return
            string(
                abi.encodePacked(
                    _baseTokenURI,
                    "/",
                    Strings.toString(_tokenId),
                    ".json"
                )
            );
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721A, IERC165)
        returns (bool)
    {
        return (interfaceId == type(ERC2981Royality).interfaceId ||
            interfaceId == type(Ownable).interfaceId ||
            interfaceId == type(PullPayment).interfaceId ||

            super.supportsInterface(interfaceId));
    }

    //@notice: reduce opensea gas fees
    function isApprovedForAll(address _owner, address _operator)
        public
        view
        override
        returns (bool isOperator)
    {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(_owner)) == _operator) {
            return true;
        }

        // otherwise, use the default ERC721.isApprovedForAll()
        return ERC721A.isApprovedForAll(_owner, _operator);
    }


}
