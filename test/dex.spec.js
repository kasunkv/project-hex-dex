// The user must have ETH deposited such that deposited Eth >= buy order value
// The user must have enough tokens deposited such that token balance >= sell order amount
// The first order ([0]) in the BUY order book should have the highest price. Meaning that the Buy order
/// Book should be ordered on price from highest to lowest starting at index 0

const truffleAssert = require("truffle-assertions");

const HexDex = artifacts.require("HexDex");
const Link = artifacts.require("LinkToken");

contract.skip("Contract: HexDex Order Book Functionality", (accounts) => {
  let dex;
  let link;
  let linkSymbol;
  let linkTicker;
  let ethTicker;

  const ownerAccount = accounts[0];
  const nonOwnerAccount = accounts[0];

  before(async () => {
    dex = await HexDex.deployed();
    link = await Link.deployed();

    linkSymbol = await link.symbol();
    linkTicker = web3.utils.fromUtf8(linkSymbol);
    ethTicker = web3.utils.fromUtf8("ETH");

    await link.approve(dex.address, 10000);
  });

  it("Should revert when not enough ETH to create the buy order.", async () => {
    await truffleAssert.reverts(dex.createLimitOrder(ethTicker, 10, 4, 0));
  });

  it("Should pass when enough ETH to create the buy order.", async () => {
    await dex.depositEth({ value: 1000 });
    await truffleAssert.passes(dex.createLimitOrder(ethTicker, 10, 4, 0));
  });

  it("Should revert when not enough LINK to create the LINK sell order", async () => {
    await truffleAssert.reverts(dex.createLimitOrder(linkTicker, 100, 20, 1));
  });

  it("Should pass when enough LINK to create the LINK sell order", async () => {
    await dex.addToken(linkTicker, link.address, { from: ownerAccount });
    await dex.deposit(1000, linkTicker);

    await truffleAssert.passes(dex.createLimitOrder(linkTicker, 10, 2, 1));
  });

  // [30, 10, 20]

  it("Should have the BUY order book ordered from highest to lowers price starting at index 0", async () => {
    await dex.depositEth({ value: 1000 });

    await dex.createLimitOrder(linkTicker, 1, 30, 0);
    await dex.createLimitOrder(linkTicker, 1, 10, 0);
    await dex.createLimitOrder(linkTicker, 1, 20, 0);

    const buyOrderBook = await dex.getOrderBook(linkTicker, 0);
    assert(buyOrderBook.length > 0, "Order book can not be empty.");

    for (let i = 0; i < buyOrderBook.length - 1; i++) {
      console.log(`Condition : ${buyOrderBook[i].price} >= ${buyOrderBook[i + 1].price}`);
      assert(buyOrderBook[i].price >= buyOrderBook[i + 1].price, "Order is incorrect");
    }
  });

  it("Should have the SELL order book ordered from lowest to highest price starting at index 0", async () => {
    await dex.createLimitOrder(linkTicker, 1, 30, 1);
    await dex.createLimitOrder(linkTicker, 1, 10, 1);
    await dex.createLimitOrder(linkTicker, 1, 20, 1);

    const sellOrderBook = await dex.getOrderBook(linkTicker, 1);
    assert(sellOrderBook.length > 0, "Order book can not be empty.");

    // 2, 10, 20, 30
    for (let i = 0; i < sellOrderBook.length - 1; i++) {
      console.log(`Condition : ${sellOrderBook[i].price} <= ${sellOrderBook[i + 1].price}`);
      assert(sellOrderBook[i].price <= sellOrderBook[i + 1].price, "Order is incorrect");
    }
  });
});

contract("Contract: HexDex Market Order Functionality", (accounts) => {
  let dex;
  let link;
  let linkSymbol;
  let linkTicker;
  let ethTicker;

  const ownerAccount = accounts[0];
  const nonOwnerAccount = accounts[0];

  before(async () => {
    dex = await HexDex.deployed();
    link = await Link.deployed();

    linkSymbol = await link.symbol();
    linkTicker = web3.utils.fromUtf8(linkSymbol);
    ethTicker = web3.utils.fromUtf8("ETH");

    await link.approve(dex.address, 10000);
  });

  it("Should have enough tokens to create the SELL Market order.", async () => {
    const linkBalance = await dex.balanceOf(ownerAccount, linkTicker);
    assert.equal(linkBalance.toNumber(), 0, "LINK token balance is not zero");

    await truffleAssert.reverts(dex.createMarketOrder(linkTicker, 20, 1));
  });

  it("Should have enough ETH to create the BUY Market order.", async () => {
    const ethBalance = await dex.balanceOf(ownerAccount, ethTicker);
    assert.equal(ethBalance, 0, "Eth token balance is not zero");

    await truffleAssert.reverts(dex.createMarketOrder(linkTicker, 2, 0));
  });

  it("Should be able to submit a market order even if the order book is empty.", async () => {
    await dex.depositEth({ value: 1000 });

    let orderBook = await dex.getOrderBook(linkTicker, 0);
    assert(orderBook.length === 0, "Buy order book is not empty");

    await truffleAssert.passes(dex.createMarketOrder(linkTicker, 2, 0));
  });

  it("Should complete the market order until the order book is 100% filled.", async () => {
    let orderBook = await dex.getOrderBook(linkTicker, 1);
    assert(orderBook.length === 0, "Sell order book should be empty to start the test");

    await dex.addToken(linkTicker, link.address);

    // Send link from the owner account to 3 other accounts
    await link.transfer(accounts[1], 50);
    await link.transfer(accounts[2], 50);
    await link.transfer(accounts[3], 50);

    const balance = await link.balanceOf(accounts[1]);
    console.log(`Account[1] LINK balance: ${balance}`);

    // Approve Dex account for the accounts 1, 2, 3
    await link.approve(dex.address, 50, { from: accounts[1] });
    await link.approve(dex.address, 50, { from: accounts[2] });
    await link.approve(dex.address, 50, { from: accounts[3] });

    // Deposit LINK into dex for accounts 1, 2, 3
    await dex.deposit(50, linkTicker, { from: accounts[1] });
    await dex.deposit(50, linkTicker, { from: accounts[2] });
    await dex.deposit(50, linkTicker, { from: accounts[3] });

    // Fill the sell order book.
    await dex.createLimitOrder(linkTicker, 5, 300, 1, { from: accounts[1] });
    await dex.createLimitOrder(linkTicker, 5, 400, 1, { from: accounts[2] });
    await dex.createLimitOrder(linkTicker, 5, 500, 1, { from: accounts[3] });

    // Create market order that should fill 2/3 orders in the book
    await dex.createMarketOrder(linkTicker, 10, 0);

    // Get the order book and assert
    orderBook = await dex.getOrderBook(linkTicker, 1);
    assert(orderBook.length === 1, "Sell order book should only have 1 order left");
    assert(orderBook[0].filled === 0, "Sell order should have 1 order left.");
  });

  it("Should complete the market order until the order book is empty or the market order is filled.", async () => {
    let orderBook = await dex.getOrderBook(linkTicker, 1);
    assert(orderBook.length === 1, "Sell order book should be empty to start the test");

    // Fill the order book
    await dex.createLimitOrder(linkTicker, 5, 400, 1, { from: accounts[1] });
    await dex.createLimitOrder(linkTicker, 5, 500, 1, { from: accounts[2] });

    // check buyer link balance
    const buyerBeforeBalance = await dex.balanceOf(ownerAccount, linkTicker);

    // Create market order that could fill more than the entire order book.
    await dex.createMarketOrder(linkTicker, 50, 0);

    const buyerAfterBalance = await dex.balanceOf(ownerAccount, linkTicker);

    assert.equal(buyerBeforeBalance + 15, buyerAfterBalance);
  });

  it("Should decrease the ETH balance of the buyer once the orders are filled..", async () => {
    // seller deposit link and creates a sell order
    await link.approve(dex.address, 500, { from: accounts[1] });
    await dex.createLimitOrder(linkTicker, 1, 300, 1, { from: accounts[1] });

    // Check buyer eth balance before sale.
    const buyerBeforeBalance = await dex.balanceOf(ownerAccount, linkTicker);
    await dex.createMarketOrder(linkTicker, 1, 0);
    const buyerAfterBalance = await dex.balanceOf(ownerAccount, linkTicker);

    assert.equal(buyerBeforeBalance - 300, buyerAfterBalance);
  });

  it("Should decrease the token balance of the sellers once the orders are filled.", async () => {
    // Check the sell order book
    let orderBook = await dex.getOrderBook(linkTicker, 1);
    assert(orderBook.length === 0, "Sell order book should be empty at the start");

    // Deposit link to seller 2
    await link.approve(dex.address, 500, { from: accounts[2] });
    await dex.deposit(100, linkTicker, { from: accounts[2] });

    await dex.createLimitOrder(linkTicker, 1, 300, 1, { from: accounts[1] });
    await dex.createLimitOrder(linkTicker, 1, 300, 1, { from: accounts[2] });

    // Check seller balances before
    let seller1BeforeBalance = await dex.balanceOf(accounts[1], linkTicker);
    let seller2BeforeBalance = await dex.balanceOf(accounts[2], linkTicker);

    // account 0 creates a market order to buy all sell orders
    await dex.createMarketOrder(linkTicker, 2, 0);

    // Check link balances of the sellers after
    let seller1AfterBalance = await dex.balanceOf(accounts[1], linkTicker);
    let seller2AfterBalance = await dex.balanceOf(accounts[2], linkTicker);

    // Assert
    assert.equal(seller1BeforeBalance - 1, seller1AfterBalance);
    assert.equal(seller2BeforeBalance - 1, seller2AfterBalance);
  });

  it("Should Remove the filled limit orders from the order book.", async () => {
    let orderBook = await dex.getOrderBook(linkTicker, 1);
    assert(orderBook.length === 0, "Sell order book should be empty at the start");

    await dex.createLimitOrder(linkTicker, 1, 300, 1, { from: accounts[1] });
    await dex.createMarketOrder(linkTicker, 1, 0);

    orderBook = await dex.getOrderBook(linkTicker, 1);
    assert(orderBook.length === 0, "Sell order book should be empty");
  });

  it("Should set the property of the limit orders that were filled after trading", async () => {
    let orderBook = await dex.getOrderBook(linkTicker, 1);
    assert(orderBook.length === 0, "Sell order book should be empty at the start");

    await dex.createLimitOrder(linkTicker, 5, 300, 1, { from: accounts[1] });
    await dex.createMarketOrder(linkTicker, 2, 0);

    orderBook = await dex.getOrderBook(linkTicker, 1);
    assert.equal(orderBook[0].filled, 2);
    assert.equal(orderBook[0].amount, 5);
  });
});
