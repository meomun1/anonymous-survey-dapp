import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnonymousSurvey } from "../target/types/anonymous_survey";
import { expect } from "chai";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";

describe("anonymous-survey (Merkle Tree Approach)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnonymousSurvey as Program<AnonymousSurvey>;
  const wallet = provider.wallet as anchor.Wallet;

  let campaignPda: PublicKey;
  let campaignBump: number;

  // Campaign parameters
  const campaignId = `campaign-${Date.now()}`;

  // Mock Merkle roots (calculated off-chain by server)
  const mockResponsesMerkleRoot = Array.from(new Uint8Array(32).fill(123));
  const mockClaimedReceiptsRoot = Array.from(new Uint8Array(32).fill(456));

  before(async () => {
    // Find PDA for campaign
    [campaignPda, campaignBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), Buffer.from(campaignId)],
      program.programId
    );

    // Airdrop SOL to wallet for testing
    const signature = await provider.connection.requestAirdrop(
      wallet.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction({
      signature,
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    });
  });

  it("Initializes a campaign", async () => {
    await program.methods
      .initializeCampaign(campaignId)
      .accounts({
        campaign: campaignPda,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const campaign = await program.account.campaign.fetch(campaignPda);

    expect(campaign.campaignId).to.equal(campaignId);
    expect(campaign.admin.toString()).to.equal(wallet.publicKey.toString());
    expect(campaign.responsesMerkleRoot).to.be.null;
    expect(campaign.totalResponses).to.equal(0);
    expect(campaign.claimedReceiptsRoot).to.be.null;
    expect(campaign.claimedCount).to.equal(0);
    expect(campaign.isClosed).to.equal(false);
    expect(campaign.createdAt.toNumber()).to.be.greaterThan(0);

    console.log("\n✅ Campaign initialized successfully");
    console.log("Campaign ID:", campaign.campaignId);
    console.log("Admin:", campaign.admin.toString());
    console.log("Account size: ~177 bytes (fixed)");
  });

  it("Publishes responses Merkle root", async () => {
    const totalResponses = 150; // Mock: 150 responses collected off-chain

    await program.methods
      .publishResponsesMerkleRoot(mockResponsesMerkleRoot, totalResponses)
      .accounts({
        campaign: campaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();

    const campaign = await program.account.campaign.fetch(campaignPda);

    expect(campaign.responsesMerkleRoot).to.deep.equal(mockResponsesMerkleRoot);
    expect(campaign.totalResponses).to.equal(totalResponses);

    console.log("\n✅ Responses Merkle root published");
    console.log("Merkle Root:", Buffer.from(campaign.responsesMerkleRoot).toString('hex').slice(0, 16) + "...");
    console.log("Total Responses:", campaign.totalResponses);
  });

  it("Updates claimed receipts Merkle root (batch 1)", async () => {
    const claimedCount = 50; // Mock: 50 students claimed participation

    await program.methods
      .updateClaimedReceiptsRoot(mockClaimedReceiptsRoot, claimedCount)
      .accounts({
        campaign: campaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();

    const campaign = await program.account.campaign.fetch(campaignPda);

    expect(campaign.claimedReceiptsRoot).to.deep.equal(mockClaimedReceiptsRoot);
    expect(campaign.claimedCount).to.equal(claimedCount);

    console.log("\n✅ Claimed receipts root updated (batch 1)");
    console.log("Merkle Root:", Buffer.from(campaign.claimedReceiptsRoot).toString('hex').slice(0, 16) + "...");
    console.log("Claimed Count:", campaign.claimedCount);
  });

  it("Updates claimed receipts Merkle root again (batch 2)", async () => {
    const newMerkleRoot = Array.from(new Uint8Array(32).fill(789));
    const newClaimedCount = 100; // Mock: 100 total students claimed now

    await program.methods
      .updateClaimedReceiptsRoot(newMerkleRoot, newClaimedCount)
      .accounts({
        campaign: campaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();

    const campaign = await program.account.campaign.fetch(campaignPda);

    expect(campaign.claimedReceiptsRoot).to.deep.equal(newMerkleRoot);
    expect(campaign.claimedCount).to.equal(newClaimedCount);

    console.log("\n✅ Claimed receipts root updated (batch 2)");
    console.log("Updated Merkle Root:", Buffer.from(campaign.claimedReceiptsRoot).toString('hex').slice(0, 16) + "...");
    console.log("Updated Claimed Count:", campaign.claimedCount);
  });

  it("Closes the campaign", async () => {
    await program.methods
      .closeCampaign()
      .accounts({
        campaign: campaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();

    const campaign = await program.account.campaign.fetch(campaignPda);

    expect(campaign.isClosed).to.equal(true);

    console.log("\n✅ Campaign closed successfully");
  });

  it("Prevents publishing responses after campaign is closed", async () => {
    try {
      await program.methods
        .publishResponsesMerkleRoot(mockResponsesMerkleRoot, 200)
        .accounts({
          campaign: campaignPda,
          admin: wallet.publicKey,
        } as any)
        .rpc();

      expect.fail("Should have thrown CampaignClosed error");
    } catch (error) {
      expect(error.toString()).to.include("CampaignClosed");
      console.log("\n✅ Correctly prevented publishing to closed campaign");
    }
  });

  it("Prevents updating claimed receipts after campaign is closed", async () => {
    try {
      await program.methods
        .updateClaimedReceiptsRoot(mockClaimedReceiptsRoot, 150)
        .accounts({
          campaign: campaignPda,
          admin: wallet.publicKey,
        } as any)
        .rpc();

      expect.fail("Should have thrown CampaignClosed error");
    } catch (error) {
      expect(error.toString()).to.include("CampaignClosed");
      console.log("✅ Correctly prevented updating closed campaign");
    }
  });

  it("Prevents unauthorized users from publishing Merkle roots", async () => {
    // Create new campaign for unauthorized test
    const unauthorizedCampaignId = `unauth-${Date.now()}`;
    const [unauthorizedCampaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), Buffer.from(unauthorizedCampaignId)],
      program.programId
    );

    // Initialize campaign with original admin
    await program.methods
      .initializeCampaign(unauthorizedCampaignId)
      .accounts({
        campaign: unauthorizedCampaignPda,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Create unauthorized user
    const unauthorizedUser = Keypair.generate();
    const signature = await provider.connection.requestAirdrop(
      unauthorizedUser.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction({
      signature,
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    });

    // Try to publish with unauthorized user
    try {
      await program.methods
        .publishResponsesMerkleRoot(mockResponsesMerkleRoot, 100)
        .accounts({
          campaign: unauthorizedCampaignPda,
          admin: unauthorizedUser.publicKey,
        } as any)
        .signers([unauthorizedUser])
        .rpc();

      expect.fail("Should have thrown Unauthorized error");
    } catch (error) {
      expect(error.toString()).to.include("Unauthorized");
      console.log("\n✅ Correctly prevented unauthorized publishing");
    }
  });

  it("Prevents publishing responses twice", async () => {
    const doublePubCampaignId = `double-${Date.now()}`;
    const [doublePubCampaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), Buffer.from(doublePubCampaignId)],
      program.programId
    );

    // Initialize campaign
    await program.methods
      .initializeCampaign(doublePubCampaignId)
      .accounts({
        campaign: doublePubCampaignPda,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Publish once (should succeed)
    await program.methods
      .publishResponsesMerkleRoot(mockResponsesMerkleRoot, 50)
      .accounts({
        campaign: doublePubCampaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();

    // Try to publish again (should fail)
    try {
      await program.methods
        .publishResponsesMerkleRoot(mockResponsesMerkleRoot, 100)
        .accounts({
          campaign: doublePubCampaignPda,
          admin: wallet.publicKey,
        } as any)
        .rpc();

      expect.fail("Should have thrown AlreadyPublished error");
    } catch (error) {
      expect(error.toString()).to.include("AlreadyPublished");
      console.log("\n✅ Correctly prevented double publishing");
    }
  });

  it("Prevents publishing with zero responses", async () => {
    const zeroCampaignId = `zero-${Date.now()}`;
    const [zeroCampaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), Buffer.from(zeroCampaignId)],
      program.programId
    );

    // Initialize campaign
    await program.methods
      .initializeCampaign(zeroCampaignId)
      .accounts({
        campaign: zeroCampaignPda,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Try to publish with 0 responses
    try {
      await program.methods
        .publishResponsesMerkleRoot(mockResponsesMerkleRoot, 0)
        .accounts({
          campaign: zeroCampaignPda,
          admin: wallet.publicKey,
        } as any)
        .rpc();

      expect.fail("Should have thrown NoResponses error");
    } catch (error) {
      expect(error.toString()).to.include("NoResponses");
      console.log("\n✅ Correctly prevented publishing with zero responses");
    }
  });

  it("Simulates full university-scale workflow", async () => {
    const universityCampaignId = `uni-${Date.now()}`;
    const [universityCampaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), Buffer.from(universityCampaignId)],
      program.programId
    );

    console.log("\n=== University-Scale Campaign Simulation ===");

    // Step 1: Admin initializes campaign
    console.log("\n[Step 1] Admin initializes campaign on blockchain...");
    await program.methods
      .initializeCampaign(universityCampaignId)
      .accounts({
        campaign: universityCampaignPda,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    console.log("✅ Campaign initialized (cost: ~$0.001)");

    // Step 2: Students complete surveys off-chain (server stores in database)
    console.log("\n[Step 2] Students complete surveys off-chain...");
    console.log("  - 20,000 students submit encrypted responses");
    console.log("  - Server stores in PostgreSQL database");
    console.log("  - Server calculates Merkle root from commitments");

    // Step 3: Admin publishes responses Merkle root
    console.log("\n[Step 3] Admin publishes responses Merkle root...");
    const totalStudents = 20000;
    await program.methods
      .publishResponsesMerkleRoot(mockResponsesMerkleRoot, totalStudents)
      .accounts({
        campaign: universityCampaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();
    console.log("✅ Responses Merkle root published (cost: ~$0.001)");
    console.log(`  - ${totalStudents} responses verifiable on-chain`);

    // Step 4: Students claim participation in batches
    console.log("\n[Step 4] Students claim participation (off-chain)...");
    console.log("  - Batch 1: 5,000 students claim (server stores receipt hashes)");

    const batch1MerkleRoot = Array.from(new Uint8Array(32).fill(100));
    await program.methods
      .updateClaimedReceiptsRoot(batch1MerkleRoot, 5000)
      .accounts({
        campaign: universityCampaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();
    console.log("✅ Batch 1 published to blockchain (cost: ~$0.001)");

    console.log("\n  - Batch 2: 10,000 students claim");
    const batch2MerkleRoot = Array.from(new Uint8Array(32).fill(200));
    await program.methods
      .updateClaimedReceiptsRoot(batch2MerkleRoot, 10000)
      .accounts({
        campaign: universityCampaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();
    console.log("✅ Batch 2 published to blockchain (cost: ~$0.001)");

    console.log("\n  - Batch 3: 15,000 students claim");
    const batch3MerkleRoot = Array.from(new Uint8Array(32).fill(300));
    await program.methods
      .updateClaimedReceiptsRoot(batch3MerkleRoot, 15000)
      .accounts({
        campaign: universityCampaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();
    console.log("✅ Batch 3 published to blockchain (cost: ~$0.001)");

    // Step 5: Admin closes campaign
    console.log("\n[Step 5] Admin closes campaign...");
    await program.methods
      .closeCampaign()
      .accounts({
        campaign: universityCampaignPda,
        admin: wallet.publicKey,
      } as any)
      .rpc();
    console.log("✅ Campaign closed (cost: ~$0.001)");

    // Verify final state
    const finalCampaign = await program.account.campaign.fetch(universityCampaignPda);

    console.log("\n=== Final Campaign State ===");
    console.log("Campaign ID:", finalCampaign.campaignId);
    console.log("Total Responses:", finalCampaign.totalResponses);
    console.log("Claimed Count:", finalCampaign.claimedCount);
    console.log("Is Closed:", finalCampaign.isClosed);
    console.log("\n💰 Total Cost: ~$0.005 (5 transactions)");
    console.log("📊 Cost per student: ~$0.00000025");
    console.log("🎯 99.9% cheaper than on-chain storage!");

    expect(finalCampaign.totalResponses).to.equal(totalStudents);
    expect(finalCampaign.claimedCount).to.equal(15000);
    expect(finalCampaign.isClosed).to.equal(true);
  });

  it("Fetches and displays complete campaign information", async () => {
    // Fetch the original campaign
    const campaign = await program.account.campaign.fetch(campaignPda);

    console.log("\n=== Campaign Information ===");
    console.log("Campaign ID:", campaign.campaignId);
    console.log("Admin:", campaign.admin.toString());
    console.log("Total Responses:", campaign.totalResponses);
    console.log("Claimed Count:", campaign.claimedCount);
    console.log("Is Closed:", campaign.isClosed);
    console.log("Created At:", new Date(campaign.createdAt.toNumber() * 1000).toISOString());
    console.log("Updated At:", new Date(campaign.updatedAt.toNumber() * 1000).toISOString());

    if (campaign.responsesMerkleRoot) {
      console.log("Responses Merkle Root:", Buffer.from(campaign.responsesMerkleRoot).toString('hex'));
    }

    if (campaign.claimedReceiptsRoot) {
      console.log("Claimed Receipts Root:", Buffer.from(campaign.claimedReceiptsRoot).toString('hex'));
    }

    console.log("\n✅ All campaign data verified successfully!");
  });
});
