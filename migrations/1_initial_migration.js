const Wallet = artifacts.require("Wallet");
const LinkToken = artifacts.require("LinkToken");

module.exports = async function (deployer, networks, accounts) {
  await deployer.deploy(Wallet);
  await deployer.deploy(LinkToken);

  // Get references to the deployed wallet and link token.
  let wallet = await Wallet.deployed();
  let linkToken = await LinkToken.deployed();

  // save the LINK token symbol
  const linkSymbol = await linkToken.symbol();

  // Add the LINK token to the wallet
  await wallet.addToken(web3.utils.fromUtf8(linkSymbol), linkToken.address);

  // Approve the allowance for the wallet address
  await linkToken.approve(Wallet.address, 10);

  // Make the deposit from the LINk token to the wallet.
  await wallet.deposit(10, web3.utils.fromUtf8(linkSymbol));

  // Check your balance.
  const balance = await wallet.balances(accounts[0], web3.utils.fromUtf8(linkSymbol));
  console.log(`Balance is: ${balance}`);
};
