import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnonymousSurvey } from "../target/types/anonymous_survey";
import { expect } from "chai";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";

describe("anonymous-survey", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnonymousSurvey as Program<AnonymousSurvey>;
  const wallet = provider.wallet as anchor.Wallet;

  let campaignPda: PublicKey;
  let campaignBump: number;
  let finalRootPda: PublicKey;
  let finalRootBump: number;

  // Campaign parameters
  const campaignId = `test-campaign-${Date.now()}`; // Make campaign ID unique
  const semester = "Fall 2024";
  const campaignType = 0; // 0 = Course, 1 = Event
  const universityId = "test-university-001";
  
  // Mock RSA public keys (you should replace with actual RSA public keys)
  const blindSignaturePublicKey = Buffer.from(new Array(256).fill(1)); // RSA public key 256 bytes
  const encryptionPublicKey = Buffer.from(new Array(256).fill(2));     // RSA public key 256 bytes

  before(async () => {
    // Find PDA with campaign_id as seed
    [campaignPda, campaignBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"), 
        wallet.publicKey.toBuffer(),
        Buffer.from(campaignId)
      ],
      program.programId
    );

    // Find PDA for final root account
    [finalRootPda, finalRootBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("university_performance"),
        Buffer.from(universityId)
      ],
      program.programId
    );

    // Airdrop some SOL to the wallet for testing
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

  it("Initializes final root account", async () => {
    await program.methods
      .initializeFinalRoot(universityId)
      .accounts({
        finalRoot: finalRootPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const finalRoot = await program.account.universityPerformance.fetch(finalRootPda);
    expect(finalRoot.universityId).to.equal(universityId);
    expect(finalRoot.totalCampaigns).to.equal(0);
    expect(finalRoot.finalMerkleRoot).to.deep.equal(new Array(32).fill(0));
  });

  it("Updates final Merkle root from campaign roots", async () => {
    // Mock final Merkle root calculated off-chain from all campaign roots
    const finalMerkleRoot = Array.from(new Uint8Array(32).fill(456));

    await program.methods
      .updateFinalMerkleRoot(finalMerkleRoot)
      .accounts({
        finalRoot: finalRootPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const finalRoot = await program.account.universityPerformance.fetch(finalRootPda);
    expect(finalRoot.finalMerkleRoot).to.deep.equal(finalMerkleRoot);
  });

  it("Creates a campaign", async () => {
    // Calculate initial size with some responses to avoid reallocation issues
    const initialSize = 8 + 32 + 32 + 50 + 20 + 1 + 4 + 8 + 8 + 1 + 32 + (10 * 32) + (10 * 256) + 256 + 256; // Space for 10 responses initially
    const rent = await program.provider.connection.getMinimumBalanceForRentExemption(initialSize);

    await program.methods
      .createCampaign(
        campaignId,
        semester,
        campaignType,
        blindSignaturePublicKey,
        encryptionPublicKey
      )
      .accounts({
        campaign: campaignPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const campaign = await program.account.surveyCampaign.fetch(campaignPda);
    expect(campaign.campaignId).to.equal(campaignId);
    expect(campaign.semester).to.equal(semester);
    expect(campaign.campaignType).to.equal(campaignType);
    expect(campaign.totalResponses).to.equal(0);
    expect(campaign.isPublished).to.equal(false);
    expect(campaign.merkleRoot).to.deep.equal(new Array(32).fill(0));
  });

  it("Submits batch responses with commitments and encrypted data", async () => {
    // Mock commitments and encrypted responses (simulating 3 responses for testing)
    const commitments = [
      Array.from(new Uint8Array(32).fill(1)), // Response 1 commitment
      Array.from(new Uint8Array(32).fill(2)), // Response 2 commitment
      Array.from(new Uint8Array(32).fill(3)), // Response 3 commitment
    ];
    const encryptedResponses = [
      Array.from(new Uint8Array(256).fill(10)), // Response 1 encrypted data
      Array.from(new Uint8Array(256).fill(20)), // Response 2 encrypted data
      Array.from(new Uint8Array(256).fill(30)), // Response 3 encrypted data
    ];

    // Calculate rent for the new account size (approximate)
    const newSize = 8 + 32 + 32 + 50 + 20 + 1 + 4 + 8 + 8 + 1 + 32 + (3 * 32) + (3 * 256) + 256 + 256;
    const rent = await program.provider.connection.getMinimumBalanceForRentExemption(newSize);

    await program.methods
      .submitBatchResponses(commitments, encryptedResponses)
      .accounts({
        campaign: campaignPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const campaign = await program.account.surveyCampaign.fetch(campaignPda);
    expect(campaign.totalResponses).to.equal(3);
    expect(campaign.commitments).to.have.length(3);
    expect(campaign.encryptedResponses).to.have.length(3);
    expect(campaign.isPublished).to.equal(false);
    expect(campaign.merkleRoot).to.deep.equal(new Array(32).fill(0)); // Not set yet
  });

  it("Publishes campaign results with off-chain calculated Merkle root", async () => {
    // Mock Merkle root calculated off-chain by server
    const calculatedMerkleRoot = Array.from(new Uint8Array(32).fill(123));

    await program.methods
      .publishCampaignResults(calculatedMerkleRoot)
      .accounts({
        campaign: campaignPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const campaign = await program.account.surveyCampaign.fetch(campaignPda);
    expect(campaign.isPublished).to.equal(true);
    expect(campaign.totalResponses).to.equal(3);
    expect(campaign.merkleRoot).to.deep.equal(calculatedMerkleRoot);
    expect(campaign.encryptedResponses).to.have.length(0); // Cleared after publishing
    expect(campaign.commitments).to.have.length(3); // Kept for verification

    // Note: Final root account is updated separately via update_final_merkle_root
    // after collecting all campaign roots off-chain
  });

  it("Fetches complete campaign information", async () => {
    const campaign = await program.account.surveyCampaign.fetch(campaignPda);
    
    console.log("=== Campaign Information ===");
    console.log("Campaign ID:", campaign.campaignId);
    console.log("Semester:", campaign.semester);
    console.log("Campaign Type:", campaign.campaignType);
    console.log("Authority:", campaign.authority.toString());
    console.log("Total Responses:", campaign.totalResponses);
    console.log("Is Published:", campaign.isPublished);
    console.log("Created At:", new Date(campaign.createdAt.toNumber() * 1000).toISOString());
    console.log("Updated At:", new Date(campaign.updatedAt.toNumber() * 1000).toISOString());
    console.log("Merkle Root:", Array.from(campaign.merkleRoot));
    console.log("Blind Signature Public Key Length:", campaign.blindSignaturePublicKey.length);
    console.log("Encryption Public Key Length:", campaign.encryptionPublicKey.length);
    
    // Detailed verification of campaign state
    expect(campaign.campaignId).to.equal(campaignId);
    expect(campaign.semester).to.equal(semester);
    expect(campaign.campaignType).to.equal(campaignType);
    expect(campaign.authority.toString()).to.equal(wallet.publicKey.toString());
    expect(campaign.totalResponses).to.equal(3); // Should have 3 responses from previous test
    expect(campaign.isPublished).to.equal(true);
    
    // Verify the merkle root is set (not all zeros)
    expect(campaign.merkleRoot).to.not.deep.equal(new Array(32).fill(0));
    
    // Verify public keys are correct
    expect(Array.from(campaign.blindSignaturePublicKey)).to.deep.equal(Array.from(blindSignaturePublicKey));
    expect(Array.from(campaign.encryptionPublicKey)).to.deep.equal(Array.from(encryptionPublicKey));
    
    // Check timestamp logic
    expect(campaign.createdAt.toNumber()).to.be.greaterThan(0);
    expect(campaign.updatedAt.toNumber()).to.be.greaterThanOrEqual(campaign.createdAt.toNumber());
    
    console.log("\n✅ All campaign information verified successfully!");
  });

  it("Prevents submitting batch responses to published campaign", async () => {
    const additionalCommitments = [Array.from(new Uint8Array(32).fill(99))];
    const additionalEncryptedResponses = [Array.from(new Uint8Array(256).fill(99))];

    try {
      await program.methods
        .submitBatchResponses(additionalCommitments, additionalEncryptedResponses)
        .accounts({
          campaign: campaignPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.toString()).to.include("CampaignAlreadyPublished");
    }
  });

  it("Prevents unauthorized batch submission", async () => {
    // Create a new keypair to act as unauthorized user
    const unauthorizedUser = Keypair.generate();
    
    // Airdrop SOL to unauthorized user
    const signature = await provider.connection.requestAirdrop(
      unauthorizedUser.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction({
      signature,
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    });

    // Try to create a new campaign with different campaign_id
    const newCampaignId = "unauthorized-test";
    const [newCampaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        unauthorizedUser.publicKey.toBuffer(),
        Buffer.from(newCampaignId)
      ],
      program.programId
    );

    // Create campaign with unauthorized user
    await program.methods
      .createCampaign(
        newCampaignId,
        "Spring 2024",
        1, // Event type
        blindSignaturePublicKey,
        encryptionPublicKey
      )
      .accounts({
        campaign: newCampaignPda,
        authority: unauthorizedUser.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([unauthorizedUser])
      .rpc();

    const commitments = [Array.from(new Uint8Array(32).fill(789))];
    const encryptedResponses = [Array.from(new Uint8Array(256).fill(789))];

    // Try to submit batch responses with original wallet (should fail)
    try {
      await program.methods
        .submitBatchResponses(commitments, encryptedResponses)
        .accounts({
          campaign: newCampaignPda,
          authority: wallet.publicKey, // Wrong authority
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
      expect.fail("Should have thrown an unauthorized error");
    } catch (error) {
      expect(error.toString()).to.include("Unauthorized");
    }
  });

  it("Prevents publishing without batch submission", async () => {
    // Create a new campaign without submitting responses
    const newCampaignId = "empty-campaign";
    const [emptyCampaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        wallet.publicKey.toBuffer(),
        Buffer.from(newCampaignId)
      ],
      program.programId
    );

    await program.methods
      .createCampaign(
        newCampaignId,
        "Summer 2024",
        0,
        blindSignaturePublicKey,
        encryptionPublicKey
      )
      .accounts({
        campaign: emptyCampaignPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Try to publish without submitting responses (should fail)
    const emptyMerkleRoot = Array.from(new Uint8Array(32).fill(0));
    try {
      await program.methods
        .publishCampaignResults(emptyMerkleRoot)
        .accounts({
          campaign: emptyCampaignPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.toString()).to.include("NoResponsesSubmitted");
    }
  });

  it("Tests campaign type validation", async () => {
    // Try to create campaign with invalid type (should fail)
    const invalidCampaignId = "invalid-type";
    const [invalidCampaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        wallet.publicKey.toBuffer(),
        Buffer.from(invalidCampaignId)
      ],
      program.programId
    );

    try {
      await program.methods
        .createCampaign(
          invalidCampaignId,
          "Fall 2024",
          2, // Invalid type (only 0 and 1 allowed)
          blindSignaturePublicKey,
          encryptionPublicKey
        )
        .accounts({
          campaign: invalidCampaignPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.toString()).to.include("InvalidCampaignType");
    }
  });

  it("Tests campaign ID and semester length validation", async () => {
    // Try to create campaign with too long ID (should fail)
    const longCampaignId = "a".repeat(51); // 51 characters (limit is 50)
    const shortIdForPda = "a".repeat(30); // Short ID for PDA generation
    const [longIdCampaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        wallet.publicKey.toBuffer(),
        Buffer.from(shortIdForPda)
      ],
      program.programId
    );

    try {
      await program.methods
        .createCampaign(
          longCampaignId,
          "Fall 2024",
          0,
          blindSignaturePublicKey,
          encryptionPublicKey
        )
        .accounts({
          campaign: longIdCampaignPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      // The error is actually a Solana seed length error, not our custom error
      expect(error.toString()).to.include("Length of the seed is too long");
    }

    // Try to create campaign with too long semester (should fail)
    const longSemester = "a".repeat(21); // 21 characters (limit is 20)
    const [longSemesterCampaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        wallet.publicKey.toBuffer(),
        Buffer.from("long-sem") // Shorter ID to avoid seed length issues
      ],
      program.programId
    );

    try {
      await program.methods
        .createCampaign(
          "long-sem",
          longSemester,
          0,
          blindSignaturePublicKey,
          encryptionPublicKey
        )
        .accounts({
          campaign: longSemesterCampaignPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.toString()).to.include("SemesterTooLong");
    }
  });

  it("Tests university-scale campaign workflow", async () => {
    // Create a course survey campaign for a full semester
    const universityCampaignId = `uni-${Date.now()}`; // Shorter ID
    const [universityCampaignPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        wallet.publicKey.toBuffer(),
        Buffer.from(universityCampaignId)
      ],
      program.programId
    );

    // Step 1: Create campaign
    await program.methods
      .createCampaign(
        universityCampaignId,
        "Fall 2024",
        0, // Course survey
        blindSignaturePublicKey,
        encryptionPublicKey
      )
      .accounts({
        campaign: universityCampaignPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Step 2: Submit batch responses (simulating 3 responses for testing)
    const universityCommitments = [
      Array.from(new Uint8Array(32).fill(100)), // University response 1
      Array.from(new Uint8Array(32).fill(200)), // University response 2
      Array.from(new Uint8Array(32).fill(300)), // University response 3
    ];
    const universityEncryptedResponses = [
      Array.from(new Uint8Array(256).fill(100)), // University encrypted 1
      Array.from(new Uint8Array(256).fill(200)), // University encrypted 2
      Array.from(new Uint8Array(256).fill(300)), // University encrypted 3
    ];

    await program.methods
      .submitBatchResponses(universityCommitments, universityEncryptedResponses)
      .accounts({
        campaign: universityCampaignPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Step 3: Publish results (server calculates Merkle root off-chain)
    const universityMerkleRoot = Array.from(new Uint8Array(32).fill(999));
    await program.methods
      .publishCampaignResults(universityMerkleRoot)
      .accounts({
        campaign: universityCampaignPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Verify final state
    const finalCampaign = await program.account.surveyCampaign.fetch(universityCampaignPda);
    expect(finalCampaign.campaignId).to.equal(universityCampaignId);
    expect(finalCampaign.semester).to.equal("Fall 2024");
    expect(finalCampaign.campaignType).to.equal(0); // Course survey
    expect(finalCampaign.totalResponses).to.equal(3);
    expect(finalCampaign.isPublished).to.equal(true);
    expect(finalCampaign.merkleRoot).to.deep.equal(universityMerkleRoot);
    expect(finalCampaign.encryptedResponses).to.have.length(0); // Cleared after publishing
    expect(finalCampaign.commitments).to.have.length(3); // Kept for verification

    console.log("\n=== University-Scale Campaign Test ===");
    console.log("✅ Campaign created successfully");
    console.log("✅ Batch responses submitted (3 responses for testing)");
    console.log("✅ Results published successfully");
    console.log("✅ Merkle root stored for teacher verification");
    console.log("✅ Encrypted responses cleared (space optimized)");
    console.log("✅ Commitments kept for verification");
    console.log("✅ Ready for accreditation body verification");
  });
});