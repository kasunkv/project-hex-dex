// SPDX-License-Identifier: MIT

pragma solidity >=0.8.7;

import "./Wallet.sol";

contract HexDex is Wallet {

	enum OrderType {
		BUY,
		SELL
	}

	struct Order {
		uint id;
		address trader;
		OrderType orderType;
		bytes32 ticker;
		uint amount;
		uint price;
		uint filled;
	}

	uint internal nextOrderId;

	mapping(bytes32 => mapping(uint => Order[])) public orderBook;

	function getOrderBook(bytes32 _ticker, OrderType _orderType) view public returns (Order[] memory) {
		return orderBook[_ticker][uint(_orderType)];
	}

	function createLimitOrder(bytes32 _ticker, uint _amount, uint _price, OrderType _type) public {
		if(_type == OrderType.BUY) {
			require(balances[msg.sender]["ETH"] >= _amount * _price, "Not enough eth to complete the BUY Order.");
		} else if (_type == OrderType.SELL) {
			require(balances[msg.sender][_ticker] >= _amount, "Not enough tokens for the SELL Order");
		}

		Order[] storage orders = orderBook[_ticker][uint(_type)];
		orders.push(Order(nextOrderId++, msg.sender, _type, _ticker, _amount, _price, 0));

		// Implement the sorting - Bubble sort
		if (_type == OrderType.BUY) {
			_sortBuy(orders);
		} else if (_type == OrderType.SELL) {
			_sortSell(orders);
		}

	}

	function createMarketOrder(bytes32 _ticker, uint _amount, OrderType _type) public  {
		if (_type == OrderType.SELL) {
			require(balances[msg.sender][_ticker] >= _amount, "Insufficient token balance");
		}

		uint orderBookType;
		uint totalFilledOrders;


		if(_type == OrderType.BUY) {
			orderBookType = 1;
		} else {
			orderBookType = 0;
		}

		Order[] storage orders = orderBook[_ticker][orderBookType];

		for (uint256 i = 0; i < orders.length && totalFilledOrders < _amount; i++) {
			uint remainingOrdersToFill = _amount - totalFilledOrders;
			uint availableOrdersToFill = orders[i].amount - orders[i].filled;
			uint filled;

			if (availableOrdersToFill > remainingOrdersToFill) {
				filled = remainingOrdersToFill;
			} else {
				filled = availableOrdersToFill;
			}

			totalFilledOrders += filled;
			orders[i].filled += filled;
			uint cost = filled * orders[i].price;

			if (_type == OrderType.BUY) {
				require(balances[msg.sender]["ETH"] >= cost);

				balances[msg.sender][_ticker] += filled;
				balances[msg.sender]["ETH"] -= cost;

				balances[orders[i].trader][_ticker] -= filled;
				balances[orders[i].trader]["ETH"] += cost;

			} else {
				balances[msg.sender][_ticker] -= filled;
				balances[msg.sender]["ETH"] += cost;

				balances[orders[i].trader][_ticker] += filled;
				balances[orders[i].trader]["ETH"] -= cost;

			}
		}

		// Remove 100% filled order from the order book
		while (orders.length > 0 && orders[0].filled == orders[0].amount) {

			for (uint i = 0; i < orders.length - 1; i++) {
				orders[i] = orders[i + 1];
			}
			orders.pop();
		}
	}

	// 30. 10. 20
	function _sortBuy(Order[] storage _orders) private {

		for (uint i = (_orders.length > 0 ? _orders.length - 1 : 0); i > 0; i--) {
			if (_orders[i].price > _orders[i - 1].price) {
				Order memory temp = _orders[i - 1];
				_orders[i - 1] = _orders[i];
				_orders[i] = temp;
			}
		}
	}

	function _sortSell(Order[] storage _orders) private {
		for (uint i = (_orders.length > 0 ? _orders.length - 1 : 0); i > 0; i--) {
			if (_orders[i].price < _orders[i - 1].price) {
				Order memory temp = _orders[i - 1];
				_orders[i - 1] = _orders[i];
				_orders[i] = temp;
			}
		}
	}
}