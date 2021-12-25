const HexDex = artifacts.require("HexDex");
const LinkToken = artifacts.require("LinkToken");

module.exports = async function (deployer, networks, accounts) {
  await deployer.deploy(HexDex);
  await deployer.deploy(LinkToken);
};
