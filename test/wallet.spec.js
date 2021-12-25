const truffleAssert = require("truffle-assertions");

const HexDex = artifacts.require("HexDex");
const Link = artifacts.require("LinkToken");

contract.skip("Contract: HexDex Wallet Functionality", (accounts) => {
  let dex;
  let link;
  let linkSymbol;
  let linkTicker;
  const ownerAccount = accounts[0];
  const nonOwnerAccount = accounts[1];

  before(async () => {
    dex = await HexDex.deployed();
    link = await Link.deployed();
    linkSymbol = await link.symbol();
    linkTicker = web3.utils.fromUtf8(linkSymbol);
    await link.approve(dex.address, 1000);
  });

  it("Should only be possible for the owner to add tokens", async () => {
    await truffleAssert.passes(dex.addToken(linkTicker, link.address, { from: ownerAccount }));
  });

  it("Should not be possible for any address other than the owner to add tokens.", async () => {
    await truffleAssert.reverts(dex.addToken(web3.utils.fromUtf8("SOL"), link.address, { from: nonOwnerAccount }));
  });

  it("Should handle token deposits correctly.", async () => {
    await dex.deposit(10, linkTicker);
    const balance = await dex.balanceOf(ownerAccount, linkTicker);
    assert.equal(balance, 10);
  });

  it("Should revert when balance is checked for a linkTicker that is not yet added to the dex.", async () => {
    await truffleAssert.reverts(dex.balanceOf(ownerAccount, web3.utils.fromUtf8("SOL")));
  });

  it("Should not allow withdraw more than what an address owns.", async () => {
    const balance = await dex.balanceOf(ownerAccount, linkTicker);
    await truffleAssert.reverts(dex.withdraw(balance + 10, linkTicker));
  });

  it("Should allow withdraw less than what an address owns", async () => {
    const balance = await dex.balanceOf(ownerAccount, linkTicker);
    await truffleAssert.passes(dex.withdraw(balance - 5, linkTicker));
  });

  it("Should allow withdraw exactly the amount an address owns.", async () => {
    const balance = await dex.balanceOf(ownerAccount, linkTicker);
    await truffleAssert.passes(dex.withdraw(balance, linkTicker));
  });

  xit("Calculating gas fees...", (done) => {
    setTimeout(done, 5000);
  });
});
