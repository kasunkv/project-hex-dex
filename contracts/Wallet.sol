// SPDX-License-Identifier: MIT

pragma solidity >=0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
contract Wallet is Ownable {

	struct Token {
		bytes32 ticker;
		address tokenAddress;
	}

	bytes32[] public tokenList;
	mapping(bytes32 => Token) public tokens;


	mapping(address => mapping(bytes32 => uint256)) internal balances;

	modifier tokenExists(bytes32 _ticker) {
		require(tokens[_ticker].tokenAddress != address(0), "ERC 20 token is not added to the dex wallet yet");
		_;
	}

	function balanceOf(address _address, bytes32 _ticker) external tokenExists(_ticker) view returns (uint) {
		return balances[_address][_ticker];
	}

	function addToken(bytes32 _ticker, address _tokenAddress) external onlyOwner {
		tokens[_ticker] = Token(_ticker, _tokenAddress);
		tokenList.push(_ticker);
	}

	function deposit(uint256 _amount, bytes32 _ticker) external tokenExists(_ticker) {
		IERC20(tokens[_ticker].tokenAddress).transferFrom(msg.sender, address(this), _amount);

		balances[msg.sender][_ticker] += _amount;
	}

	function withdraw(uint256 _amount, bytes32 _ticker) external {
		uint256 currentTokenBalance = balances[msg.sender][_ticker];
		require(currentTokenBalance >= _amount, "Insufficient token balance for withdrawal");

		balances[msg.sender][_ticker] = currentTokenBalance - _amount;

		IERC20(tokens[_ticker].tokenAddress).transfer(msg.sender, _amount);
	}

	function depositEth() public payable {
		balances[msg.sender]["ETH"] += msg.value;
	}
}