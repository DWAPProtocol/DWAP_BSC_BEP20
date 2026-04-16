// Integration Guide for DWAP Contracts
// دليل التكامل مع عقود DWAP

const ethers = require('ethers');

// ============================================================================
// 1. الاتصال بالعقود
// ============================================================================

class DWAPIntegration {
  constructor(tokenAddress, governorAddress, timelockAddress, rpcUrl) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.tokenAddress = tokenAddress;
    this.governorAddress = governorAddress;
    this.timelockAddress = timelockAddress;
  }

  /**
   * الاتصال بعقد التوكن
   */
  async getTokenContract() {
    const ABI = [
      // ERC20 Interface
      'function name() public view returns (string)',
      'function symbol() public view returns (string)',
      'function decimals() public view returns (uint8)',
      'function totalSupply() public view returns (uint256)',
      'function balanceOf(address account) public view returns (uint256)',
      'function transfer(address to, uint256 amount) public returns (bool)',
      'function approve(address spender, uint256 amount) public returns (bool)',
      'function allowance(address owner, address spender) public view returns (uint256)',
      
      // ERC20Burnable Interface
      'function burn(uint256 amount) public',
      'function burnFrom(address account, uint256 amount) public',
      'function communityBurn(uint256 amount) external',
      'function ownerBurn(uint256 amount) external onlyOwner',
      
      // ERC20Votes Interface
      'function delegate(address delegatee) public',
      'function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) public',
      'function getVotes(address account) public view returns (uint256)',
      'function getPriorVotes(address account, uint256 blockNumber) public view returns (uint256)',
      
      // ERC20Permit Interface
      'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) public',
      
      // Ownable Interface
      'function owner() public view returns (address)',
      'function transferOwnership(address newOwner) public',
      
      // UUPS Interface
      'function upgradeToAndCall(address newImplementation, bytes calldata data) public',
    ];

    return new ethers.Contract(this.tokenAddress, ABI, this.provider);
  }

  /**
   * الاتصال بعقد الحاكم
   */
  async getGovernorContract() {
    const ABI = [
      'function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) public returns (uint256)',
      'function castVote(uint256 proposalId, uint8 support) public returns (uint256)',
      'function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) public returns (uint256)',
      'function castVoteBySig(uint256 proposalId, uint8 support, uint8 v, bytes32 r, bytes32 s) public returns (uint256)',
      'function execute(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) public payable',
      'function queue(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) public',
      'function cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) public',
      'function state(uint256 proposalId) public view returns (uint8)',
      'function proposalVotes(uint256 proposalId) public view returns (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes)',
      'function votingDelay() public view returns (uint256)',
      'function votingPeriod() public view returns (uint256)',
      'function quorum(uint256 blockNumber) public view returns (uint256)',
      'function proposalThreshold() public view returns (uint256)',
      'function hasVoted(uint256 proposalId, address account) public view returns (bool)',
    ];

    return new ethers.Contract(this.governorAddress, ABI, this.provider);
  }

  /**
   * الاتصال بعقد Timelock
   */
  async getTimelockContract() {
    const ABI = [
      'function schedule(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt, uint256 delay) public',
      'function execute(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt) public payable',
      'function cancel(bytes32 id) public',
      'function isOperationReady(bytes32 id) public view returns (bool)',
      'function isOperationDone(bytes32 id) public view returns (bool)',
      'function minDelay() public view returns (uint256)',
    ];

    return new ethers.Contract(this.timelockAddress, ABI, this.provider);
  }
}

// ============================================================================
// 2. أمثلة الاستخدام
// ============================================================================

/**
 * مثال 1: الحصول على معلومات التوكن
 */
async function getTokenInfo(integration) {
  const token = await integration.getTokenContract();
  
  const name = await token.name();
  const symbol = await token.symbol();
  const decimals = await token.decimals();
  const totalSupply = await token.totalSupply();
  
  console.log(`التوكن: ${name} (${symbol})`);
  console.log(`العرض الإجمالي: ${ethers.formatUnits(totalSupply, decimals)}`);
}

/**
 * مثال 2: التحقق من رصيد المحفظة
 */
async function checkBalance(integration, address) {
  const token = await integration.getTokenContract();
  const balance = await token.balanceOf(address);
  const decimals = await token.decimals();
  
  console.log(`الرصيد: ${ethers.formatUnits(balance, decimals)} DWAP`);
}

/**
 * مثال 3: التفويض للتصويت
 */
async function delegateVoting(integration, delegatee, privateKey) {
  const wallet = new ethers.Wallet(privateKey, integration.provider);
  const token = await integration.getTokenContract();
  const tokenWithSigner = token.connect(wallet);
  
  const tx = await tokenWithSigner.delegate(delegatee);
  const receipt = await tx.wait();
  
  console.log(`تم تفويض الأصوات بنجاح: ${receipt.hash}`);
}

/**
 * مثال 4: حرق التوكنات من المجتمع
 */
async function burnTokens(integration, amount, privateKey) {
  const wallet = new ethers.Wallet(privateKey, integration.provider);
  const token = await integration.getTokenContract();
  const tokenWithSigner = token.connect(wallet);
  
  const amountWei = ethers.parseUnits(amount, 18);
  const tx = await tokenWithSigner.communityBurn(amountWei);
  const receipt = await tx.wait();
  
  console.log(`تم حرق ${amount} توكن: ${receipt.hash}`);
}

/**
 * مثال 5: إنشاء مقترح DAO
 */
async function createProposal(integration, proposal, privateKey) {
  const wallet = new ethers.Wallet(privateKey, integration.provider);
  const governor = await integration.getGovernorContract();
  const governorWithSigner = governor.connect(wallet);
  
  const tx = await governorWithSigner.propose(
    proposal.targets,
    proposal.values,
    proposal.calldatas,
    proposal.description
  );
  
  const receipt = await tx.wait();
  console.log(`تم إنشاء المقترح: ${receipt.hash}`);
  
  // الحصول على معرف المقترح
  const proposalId = receipt.logs[0].topics[1];
  return proposalId;
}

/**
 * مثال 6: التصويت على المقترح
 */
async function voteOnProposal(integration, proposalId, support, privateKey) {
  const wallet = new ethers.Wallet(privateKey, integration.provider);
  const governor = await integration.getGovernorContract();
  const governorWithSigner = governor.connect(wallet);
  
  // support: 0 = ضد, 1 = موافق, 2 = امتناع
  const tx = await governorWithSigner.castVote(proposalId, support);
  const receipt = await tx.wait();
  
  console.log(`تم تسجيل الصوت: ${receipt.hash}`);
}

/**
 * مثال 7: التصويت مع السبب
 */
async function voteWithReason(integration, proposalId, support, reason, privateKey) {
  const wallet = new ethers.Wallet(privateKey, integration.provider);
  const governor = await integration.getGovernorContract();
  const governorWithSigner = governor.connect(wallet);
  
  const tx = await governorWithSigner.castVoteWithReason(proposalId, support, reason);
  const receipt = await tx.wait();
  
  console.log(`تم تسجيل الصوت مع السبب: ${receipt.hash}`);
}

/**
 * مثال 8: الحصول على حالة المقترح
 */
async function getProposalState(integration, proposalId) {
  const governor = await integration.getGovernorContract();
  const state = await governor.state(proposalId);
  
  const states = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
  console.log(`حالة المقترح: ${states[state]}`);
  
  return states[state];
}

/**
 * مثال 9: الحصول على نتائج التصويت
 */
async function getVoteResults(integration, proposalId) {
  const governor = await integration.getGovernorContract();
  const votes = await governor.proposalVotes(proposalId);
  
  console.log(`الأصوات المؤيدة: ${ethers.formatUnits(votes.forVotes, 18)}`);
  console.log(`الأصوات المعارضة: ${ethers.formatUnits(votes.againstVotes, 18)}`);
  console.log(`الأصوات الممتنعة: ${ethers.formatUnits(votes.abstainVotes, 18)}`);
  
  return votes;
}

/**
 * مثال 10: تنفيذ المقترح
 */
async function executeProposal(integration, proposal, description, privateKey) {
  const wallet = new ethers.Wallet(privateKey, integration.provider);
  const governor = await integration.getGovernorContract();
  const governorWithSigner = governor.connect(wallet);
  
  const descriptionHash = ethers.id(description);
  
  const tx = await governorWithSigner.execute(
    proposal.targets,
    proposal.values,
    proposal.calldatas,
    descriptionHash
  );
  
  const receipt = await tx.wait();
  console.log(`تم تنفيذ المقترح: ${receipt.hash}`);
}

// ============================================================================
// 3. مثال متكامل: سير العمل الكامل
// ============================================================================

async function completeWorkflow() {
  // الإعدادات
  const RPC_URL = process.env.BSC_RPC_URL;
  const TOKEN_ADDRESS = process.env.DWAP_TOKEN_ADDRESS;
  const GOVERNOR_ADDRESS = process.env.DWAP_GOVERNOR_ADDRESS;
  const TIMELOCK_ADDRESS = process.env.DWAP_TIMELOCK_ADDRESS;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  const integration = new DWAPIntegration(
    TOKEN_ADDRESS,
    GOVERNOR_ADDRESS,
    TIMELOCK_ADDRESS,
    RPC_URL
  );
  
  // الخطوة 1: الحصول على معلومات التوكن
  console.log('=== معلومات التوكن ===');
  await getTokenInfo(integration);
  
  // الخطوة 2: التفويض للتصويت
  console.log('\n=== التفويض ===');
  const wallet = new ethers.Wallet(PRIVATE_KEY, integration.provider);
  await delegateVoting(integration, wallet.address, PRIVATE_KEY);
  
  // الخطوة 3: إنشاء مقترح
  console.log('\n=== إنشاء المقترح ===');
  const proposal = {
    targets: [TOKEN_ADDRESS],
    values: [0],
    calldatas: [
      // مثال: تحويل الملكية
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['function transferOwnership(address)'],
        [GOVERNOR_ADDRESS]
      )
    ],
    description: 'Transfer DWAP token ownership to DAO Governor'
  };
  
  const proposalId = await createProposal(integration, proposal, PRIVATE_KEY);
  
  // الخطوة 4: الانتظار ثم التصويت
  console.log('\n=== التصويت ===');
  // انتظر votingDelay من الكتل
  // ثم صوت على المقترح
  await voteOnProposal(integration, proposalId, 1, PRIVATE_KEY); // 1 = موافق
  
  // الخطوة 5: الانتظار وتنفيذ
  console.log('\n=== التنفيذ ===');
  // انتظر votingPeriod + timelockDelay
  // ثم نفذ المقترح
  await executeProposal(integration, proposal, proposal.description, PRIVATE_KEY);
}

// ============================================================================
// 4. Export
// ============================================================================

module.exports = {
  DWAPIntegration,
  getTokenInfo,
  checkBalance,
  delegateVoting,
  burnTokens,
  createProposal,
  voteOnProposal,
  voteWithReason,
  getProposalState,
  getVoteResults,
  executeProposal,
  completeWorkflow
};
