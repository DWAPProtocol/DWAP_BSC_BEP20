const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DWAP Token", function () {
  let dwapToken;
  let dwapTokenImpl;
  let deployer;
  let user1;
  let user2;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy implementation
    const DWAP_Token = await ethers.getContractFactory("DWAP_Token");
    dwapTokenImpl = await DWAP_Token.deploy();
    await dwapTokenImpl.waitForDeployment();

    // Deploy proxy
    const initializeData = dwapTokenImpl.interface.encodeFunctionData("initialize", [
      deployer.address,
    ]);

    const DWAP_TokenProxy = await ethers.getContractFactory("DWAP_TokenProxy");
    const proxy = await DWAP_TokenProxy.deploy(
      await dwapTokenImpl.getAddress(),
      initializeData
    );
    await proxy.waitForDeployment();

    // Connect to proxy as token
    dwapToken = DWAP_Token.attach(await proxy.getAddress());
  });

  describe("Initialization", function () {
    it("Should deploy with correct initial supply", async function () {
      const totalSupply = await dwapToken.totalSupply();
      const expected = ethers.parseUnits("1000000000", 18); // 1 billion
      expect(totalSupply).to.equal(expected);
    });

    it("Should deploy with correct name and symbol", async function () {
      expect(await dwapToken.name()).to.equal("DWAP Token");
      expect(await dwapToken.symbol()).to.equal("DWAP");
    });

    it("Should mint initial supply to deployer", async function () {
      const balance = await dwapToken.balanceOf(deployer.address);
      const expected = ethers.parseUnits("1000000000", 18);
      expect(balance).to.equal(expected);
    });
  });

  describe("Burning", function () {
    it("Should allow owner to burn tokens", async function () {
      const burnAmount = ethers.parseUnits("100", 18);
      const initialBalance = await dwapToken.balanceOf(deployer.address);

      await dwapToken.ownerBurn(burnAmount);

      const finalBalance = await dwapToken.balanceOf(deployer.address);
      expect(finalBalance).to.equal(initialBalance - burnAmount);
    });

    it("Should allow users to burn their tokens", async function () {
      // Transfer tokens to user1
      const transferAmount = ethers.parseUnits("1000", 18);
      await dwapToken.transfer(user1.address, transferAmount);

      const initialBalance = await dwapToken.balanceOf(user1.address);
      const burnAmount = ethers.parseUnits("100", 18);

      await dwapToken.connect(user1).communityBurn(burnAmount);

      const finalBalance = await dwapToken.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance - burnAmount);
    });

    it("Should track burned amounts", async function () {
      const burnAmount = ethers.parseUnits("100", 18);

      // Owner burn
      await dwapToken.ownerBurn(burnAmount);
      const ownerBurned = await dwapToken.totalBurnedByOwner();
      expect(ownerBurned).to.equal(burnAmount);

      // User burn
      await dwapToken.transfer(user1.address, ethers.parseUnits("1000", 18));
      await dwapToken.connect(user1).communityBurn(burnAmount);

      const userBurned = await dwapToken.totalBurnedByUsers();
      expect(userBurned).to.equal(burnAmount);
    });
  });

  describe("Voting", function () {
    it("Should have voting power after delegation", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await dwapToken.transfer(user1.address, amount);

      // User delegates to themselves
      await dwapToken.connect(user1).delegate(user1.address);

      // User should have voting power
      const votes = await dwapToken.getVotes(user1.address);
      expect(votes).to.equal(amount);
    });
  });
});

describe("DWAP Burn Controller", function () {
  let burnController;
  let dwapToken;
  let deployer;
  let user1;

  beforeEach(async function () {
    [deployer, user1] = await ethers.getSigners();

    // Deploy token
    const DWAP_Token = await ethers.getContractFactory("DWAP_Token");
    const tokenImpl = await DWAP_Token.deploy();
    await tokenImpl.waitForDeployment();

    const initTokenData = tokenImpl.interface.encodeFunctionData("initialize", [
      deployer.address,
    ]);

    const DWAP_TokenProxy = await ethers.getContractFactory("DWAP_TokenProxy");
    const tokenProxy = await DWAP_TokenProxy.deploy(
      await tokenImpl.getAddress(),
      initTokenData
    );
    await tokenProxy.waitForDeployment();

    dwapToken = DWAP_Token.attach(await tokenProxy.getAddress());

    // Deploy burn controller
    const DWAP_BurnController = await ethers.getContractFactory("DWAP_BurnController");
    const controllerImpl = await DWAP_BurnController.deploy();
    await controllerImpl.waitForDeployment();

    const initControllerData = controllerImpl.interface.encodeFunctionData("initialize", [
      await dwapToken.getAddress(),
      deployer.address,
      0,
    ]);

    const DWAP_BurnControllerProxy = await ethers.getContractFactory(
      "DWAP_BurnControllerProxy"
    );
    const controllerProxy = await DWAP_BurnControllerProxy.deploy(
      await controllerImpl.getAddress(),
      initControllerData
    );
    await controllerProxy.waitForDeployment();

    burnController = DWAP_BurnController.attach(await controllerProxy.getAddress());
  });

  describe("Burn Mechanism", function () {
    it("Should allow community to burn tokens", async function () {
      const burnAmount = ethers.parseUnits("100", 18);
      await dwapToken.transfer(user1.address, ethers.parseUnits("1000", 18));

      const initialBalance = await dwapToken.balanceOf(user1.address);

      await dwapToken
        .connect(user1)
        .approve(await burnController.getAddress(), burnAmount);
      await burnController.connect(user1).burnTokens(burnAmount);

      const finalBalance = await dwapToken.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance - burnAmount);
    });

    it("Should track community burns", async function () {
      const burnAmount = ethers.parseUnits("100", 18);
      await dwapToken.transfer(user1.address, ethers.parseUnits("1000", 18));

      await dwapToken
        .connect(user1)
        .approve(await burnController.getAddress(), burnAmount);
      await burnController.connect(user1).burnTokens(burnAmount);

      const totalBurned = await burnController.totalCommunityBurned();
      expect(totalBurned).to.equal(burnAmount);
    });
  });
});
