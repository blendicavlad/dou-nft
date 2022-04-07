//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./erc/721/ERC721A.sol";
import "./eip/2981/ERC2981Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";
import "./utils/StringUtils.sol";

contract OwnableDelegateProxy {}

/**
 * @dev Used to delegate ownership of a contract to another address, to save on unneeded transactions to approve contract use for users
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

    using StringUtils for uint256;

    string private baseURI;
    address public immutable proxyRegistryAddress;

    uint256 private constant mintSize = 10_000;
    uint256 private constant mintPrice = 0.1 ether; 
    uint256 private constant referralDiscount = 0.01 ether; //10% off

    bool private mintingActive = true;

    event UpdatedMintStatus(bool _old, bool _new);
    event FallbackPaymentReceived(address _from, uint256 _value);

    constructor(string memory _baseTokenURI, address _proxyRegistryAddress) ERC721A("Defenders of Ukraine", "DOU") {
        baseURI = _baseTokenURI;
        proxyRegistryAddress = _proxyRegistryAddress;
        reserveNFTs();
    }

    /** MINTING */

    /**
     * @notice Enables minting
     */
    function enableMinting() external onlyOwner {
        bool old = mintingActive;
        mintingActive = true;
        emit UpdatedMintStatus(old, mintingActive);
    }

    /**
     * @notice Disables minting
     */
    function disableMinting() external onlyOwner {
        bool old = mintingActive;
        mintingActive = false;
        emit UpdatedMintStatus(old, mintingActive);
    }

    /**
     * @notice Reserve NFTs
     * @notice Reserve 10 for VIP offering and 10 for initial OpenSea pre sale
     */
    function reserveNFTs() public onlyOwner {
        require(totalSupply() + 20 <= mintSize, "Can not mint that many");
        _mint(owner(), 20, "", false);
    }

    /**
     * Public Mint
     * @notice You can pay a discounted price by minting using a referral address, which is an adrress that already owns x nr of NFTs
     */
    function publicMint(uint256 amount, address referral) external payable {
        require(mintingActive, "Minting not enabled");

        uint256 _requiredAmt = 0;
        if (referral != address(0) && balanceOf(msg.sender) > 0) {
            _requiredAmt = (mintPrice * amount) - (referralDiscount * amount);
        } else {
            _requiredAmt = (mintPrice * amount);
        }

        require(
            msg.value == _requiredAmt,
            string(abi.encodePacked("Wrong amount of Ether sent, you should send: ",
             _requiredAmt.toString(), " Wei")) 
        );
        require(totalSupply() + amount <= mintSize, "Can not mint that many");
        _asyncTransfer(owner(), msg.value);
        _mint(_msgSender(), amount, "", false);
    }

    /** PAYMENTS */

    /**
     * @notice Withdraw funds from contract
     */
    function withdrawPayments(address payable payee) public virtual override onlyOwner {
        super.withdrawPayments(payee);
    }

    /**
     * @dev Called by the payer to store the sent amount as credit to be pulled.
     * Funds sent in this way are stored in an intermediate {Escrow} contract, so
     * there is no danger of them being spent before withdrawal.
     *
     * @param amount The amount to transfer.
     */
    function _asyncTransfer(address, uint256 amount) internal virtual override {
        super._asyncTransfer(owner(), amount);
    }

    /**
     * @notice ERC2981 royalty info implementation
     */
    function setRoyaltyInfo(address _royaltyAddress, uint256 _percentage)
        public
        onlyOwner
    {
        _setRoyalties(_royaltyAddress, _percentage);
    }

    /**
     * @notice Recieve function
     */
    receive() external payable {
        // From PaymentSplitter.sol
        _asyncTransfer(owner(), msg.value);
        emit FallbackPaymentReceived(_msgSender(), msg.value);
    }

    /**
     * @notice Fallback function
     */
    fallback() external payable {
        // From PaymentSplitter.sol
        _asyncTransfer(owner(), msg.value);
        emit FallbackPaymentReceived(_msgSender(), msg.value);
    }

    /** VIEWS */

    /**
     * @notice Will return whether minting is enabled
     */
    function mintStatus() external view returns (bool) {
        return mintingActive;
    }

    /**
     * @notice Will return minting fees
     */
    function mintingFee() external pure returns (uint256) {
        return mintPrice;
    }

    /**
     * @notice This is a public getter for ETH balance on contract 
        Not using address(this).balance because all payable functions are transfering to an Escorw, with the owner being the only possible payee
     */
    function getBalance() external view returns (uint256) {
        return super.payments(owner());
    }

    /**
     * @notice Will return the planned size of the collection
     */
    function collectionSize() external pure returns (uint256) {
        return mintSize;
    }

    /** IMPLEMENTATIONS */

    /**
     * @notice Accessor _baseURI()
     */
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /**
     * @notice Mutator _baseURI()
     */
    function setBaseURI(string memory _baseTokenURI) public onlyOwner {
        baseURI = _baseTokenURI;
    }

    /**
     * @notice Override for ERC721A tokenURI
     */
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

    /**
    * @dev Implementation of the IERC165 interface
    */
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

    /**
     * @dev May reduce opensea gas fees as stated in their documentation
     */
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
