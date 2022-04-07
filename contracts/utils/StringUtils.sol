//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

library StringUtils {

    /**
     * @dev Updated version of uint2str -> https://github.com/provable-things/ethereum-api/blob/master/provableAPI_0.6.sol
     */
    function toString(uint256 _it) internal pure returns (string memory _uintAsString) {
        if (_it == 0) {
            return "0";
        }
        uint j = _it;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_it != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_it - _it / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _it /= 10;
        }
        return string(bstr);
    }

}