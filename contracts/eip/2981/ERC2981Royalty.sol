//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./IERC2981.sol";

abstract contract ERC2981Royality is IERC2981 {

  address private royaltyAddress;
  uint256 private royaltyPercentage;

  function _setRoyalties(address _royalityAddress, uint256 _roialityPercentage) internal {
    royaltyAddress = _royalityAddress;
    royaltyPercentage = _roialityPercentage;
  }

 /**
  * @notice Recieves royality percent to be implemented by markets
  */
  function royaltyInfo(
    uint256 ,
    uint256 _salePrice
  ) external view override(IERC2981) returns (
    address receiver,
    uint256 royaltyAmount
  ) {
    receiver = royaltyAddress;

    royaltyAmount = _salePrice * royaltyPercentage / 100;
  }
}