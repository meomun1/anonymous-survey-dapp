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

  let surveyPda: PublicKey;
  let surveyBump: number;

  // Survey parameters
  const surveyId = `test-survey-${Date.now()}`; // Make survey ID unique
  const title = "Test Survey";
  const description = "This is a test survey";
  
  // Mock RSA public keys (you should replace with actual RSA public keys)
  const blindSignaturePublicKey = Buffer.from(new Array(256).fill(1)); // RSA public key 256 bytes
  const encryptionPublicKey = Buffer.from(new Array(256).fill(2));     // RSA public key 256 bytes

  before(async () => {
    // Find PDA with survey_id as seed
    [surveyPda, surveyBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("survey"), 
        wallet.publicKey.toBuffer(),
        Buffer.from(surveyId)
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

  it("Creates a survey", async () => {
    await program.methods
      .createSurvey(
        surveyId,
        title, 
        description,
        blindSignaturePublicKey,
        encryptionPublicKey
      )
      .accounts({
        survey: surveyPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const survey = await program.account.survey.fetch(surveyPda);
    expect(survey.surveyId).to.equal(surveyId);
    expect(survey.title).to.equal(title);
    expect(survey.description).to.equal(description);
    expect(survey.totalResponses).to.equal(0);
    expect(survey.isPublished).to.equal(false);
    expect(survey.encryptedAnswers).to.have.length(0);
    expect(survey.commitments).to.have.length(0);
  });

  it("Submits first response", async () => {
    // Mock data - in real implementation these would be actual cryptographic values
    const commitment = Array.from(new Uint8Array(32).fill(1)); // 32-byte commitment
    const encryptedAnswer = Array.from(new Uint8Array(256).fill(2)); // 256-byte RSA encrypted answer

    await program.methods
      .submitResponse(commitment, encryptedAnswer)
      .accounts({
        survey: surveyPda,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const survey = await program.account.survey.fetch(surveyPda);
    expect(survey.totalResponses).to.equal(1);
    expect(survey.commitments).to.have.length(1);
    expect(survey.encryptedAnswers).to.have.length(1);
    
    // Verify the stored data matches what we submitted
    expect(Array.from(survey.commitments[0])).to.deep.equal(commitment);
    expect(Array.from(survey.encryptedAnswers[0])).to.deep.equal(encryptedAnswer);
  });

  it("Submits second response from different user", async () => {
    // Create a second user
    const secondUser = Keypair.generate();
    
    // Airdrop SOL to second user
    const signature = await provider.connection.requestAirdrop(
      secondUser.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction({
      signature,
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    });

    // Mock data for second response
    const commitment2 = Array.from(new Uint8Array(32).fill(3)); // Different commitment
    const encryptedAnswer2 = Array.from(new Uint8Array(256).fill(4)); // Different encrypted answer

    await program.methods
      .submitResponse(commitment2, encryptedAnswer2)
      .accounts({
        survey: surveyPda,
        user: secondUser.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([secondUser])
      .rpc();

    const survey = await program.account.survey.fetch(surveyPda);
    expect(survey.totalResponses).to.equal(2);
    expect(survey.commitments).to.have.length(2);
    expect(survey.encryptedAnswers).to.have.length(2);
    
    // Verify both responses are stored correctly
    expect(Array.from(survey.commitments[0])).to.deep.equal(Array.from(new Uint8Array(32).fill(1)));
    expect(Array.from(survey.commitments[1])).to.deep.equal(commitment2);
    expect(Array.from(survey.encryptedAnswers[0])).to.deep.equal(Array.from(new Uint8Array(256).fill(2)));
    expect(Array.from(survey.encryptedAnswers[1])).to.deep.equal(encryptedAnswer2);
  });

  it("Submits third response from another different user", async () => {
    // Create a third user
    const thirdUser = Keypair.generate();
    
    // Airdrop SOL to third user
    const signature = await provider.connection.requestAirdrop(
      thirdUser.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction({
      signature,
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    });

    // Mock data for third response
    const commitment3 = Array.from(new Uint8Array(32).fill(5)); // Different commitment
    const encryptedAnswer3 = Array.from(new Uint8Array(256).fill(6)); // Different encrypted answer

    await program.methods
      .submitResponse(commitment3, encryptedAnswer3)
      .accounts({
        survey: surveyPda,
        user: thirdUser.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([thirdUser])
      .rpc();

    const survey = await program.account.survey.fetch(surveyPda);
    expect(survey.totalResponses).to.equal(3);
    expect(survey.commitments).to.have.length(3);
    expect(survey.encryptedAnswers).to.have.length(3);
    
    // Verify all three responses are stored correctly
    expect(Array.from(survey.commitments[2])).to.deep.equal(commitment3);
    expect(Array.from(survey.encryptedAnswers[2])).to.deep.equal(encryptedAnswer3);
  });

  it("Fetches complete survey information after third response", async () => {
    // Fetch the survey account data
    const survey = await program.account.survey.fetch(surveyPda);
    
    console.log("=== Survey Information After Third Response ===");
    console.log("Survey ID:", survey.surveyId);
    console.log("Title:", survey.title);
    console.log("Description:", survey.description);
    console.log("Authority:", survey.authority.toString());
    console.log("Total Responses:", survey.totalResponses);
    console.log("Is Published:", survey.isPublished);
    console.log("Created At:", new Date(survey.createdAt.toNumber() * 1000).toISOString());
    console.log("Updated At:", new Date(survey.updatedAt.toNumber() * 1000).toISOString());
    console.log("Merkle Root:", Array.from(survey.merkleRoot));
    console.log("Number of Commitments:", survey.commitments.length);
    console.log("Number of Encrypted Answers:", survey.encryptedAnswers.length);
    console.log("Blind Signature Public Key Length:", survey.blindSignaturePublicKey.length);
    console.log("Encryption Public Key Length:", survey.encryptionPublicKey.length);
    
    // Detailed verification of survey state
    expect(survey.surveyId).to.equal(surveyId);
    expect(survey.title).to.equal(title);
    expect(survey.description).to.equal(description);
    expect(survey.authority.toString()).to.equal(wallet.publicKey.toString());
    expect(survey.totalResponses).to.equal(3);
    expect(survey.isPublished).to.equal(false);
    expect(survey.commitments).to.have.length(3);
    expect(survey.encryptedAnswers).to.have.length(3);
    
    // Verify the merkle root is still empty (all zeros) before publishing
    expect(survey.merkleRoot).to.deep.equal(new Array(32).fill(0));
    
    // Verify all commitments and encrypted answers are present and correct
    console.log("\n=== Individual Responses ===");
    for (let i = 0; i < 3; i++) {
      const expectedCommitmentFill = i === 0 ? 1 : (i === 1 ? 3 : 5);
      const expectedAnswerFill = i === 0 ? 2 : (i === 1 ? 4 : 6);
      
      console.log(`Response ${i + 1}:`);
      console.log(`  Commitment: [${Array.from(survey.commitments[i]).slice(0, 5).join(", ")}...]`);
      console.log(`  Encrypted Answer: [${Array.from(survey.encryptedAnswers[i]).slice(0, 5).join(", ")}...]`);
      
      expect(Array.from(survey.commitments[i])).to.deep.equal(
        Array.from(new Uint8Array(32).fill(expectedCommitmentFill))
      );
      expect(Array.from(survey.encryptedAnswers[i])).to.deep.equal(
        Array.from(new Uint8Array(256).fill(expectedAnswerFill))
      );
    }
    
    // Verify public keys are correct
    expect(Array.from(survey.blindSignaturePublicKey)).to.deep.equal(Array.from(blindSignaturePublicKey));
    expect(Array.from(survey.encryptionPublicKey)).to.deep.equal(Array.from(encryptionPublicKey));
    
    // Check timestamp logic
    expect(survey.createdAt.toNumber()).to.be.greaterThan(0);
    expect(survey.updatedAt.toNumber()).to.be.greaterThanOrEqual(survey.createdAt.toNumber());
    
    console.log("\n✅ All survey information verified successfully!");
  });

  it("Prevents submitting when survey reaches maximum responses", async () => {
    // Submit responses until we reach the limit (MAX_RESPONSES = 10)
    // We already have 3 responses, so we need 7 more to reach the limit
    for (let i = 4; i <= 10; i++) {
      const user = Keypair.generate();
      
      // Airdrop SOL to user
      const signature = await provider.connection.requestAirdrop(
        user.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({
        signature,
        blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
        lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
      });

      const commitment = Array.from(new Uint8Array(32).fill(i));
      const encryptedAnswer = Array.from(new Uint8Array(256).fill(i));

      await program.methods
        .submitResponse(commitment, encryptedAnswer)
        .accounts({
          survey: surveyPda,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([user])
        .rpc();
    }

    // Verify we have 10 responses
    const surveyFull = await program.account.survey.fetch(surveyPda);
    expect(surveyFull.totalResponses).to.equal(10);
    expect(surveyFull.commitments).to.have.length(10);

    // Try to submit one more response (should fail)
    const overflowUser = Keypair.generate();
    
    const signature = await provider.connection.requestAirdrop(
      overflowUser.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction({
      signature,
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    });

    const commitment = Array.from(new Uint8Array(32).fill(11));
    const encryptedAnswer = Array.from(new Uint8Array(256).fill(11));

    try {
      await program.methods
        .submitResponse(commitment, encryptedAnswer)
        .accounts({
          survey: surveyPda,
          user: overflowUser.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([overflowUser])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.toString()).to.include("SurveyFull");
    }
  });

  it("Publishes survey results and clears encrypted answers", async () => {
    // Fetch survey before publishing to check encrypted answers exist
    const surveyBefore = await program.account.survey.fetch(surveyPda);
    expect(surveyBefore.encryptedAnswers).to.have.length(10);
    expect(surveyBefore.commitments).to.have.length(10);

    // Get account info before publishing to check space
    const accountInfoBefore = await provider.connection.getAccountInfo(surveyPda);
    const spaceBefore = accountInfoBefore!.data.length;
    console.log("Account space before publishing:", spaceBefore, "bytes");

    await program.methods
      .publishResults()
      .accounts({
        survey: surveyPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Get account info after publishing to check space reduction
    const accountInfoAfter = await provider.connection.getAccountInfo(surveyPda);
    const spaceAfter = accountInfoAfter!.data.length;
    console.log("Account space after publishing:", spaceAfter, "bytes");
    console.log("Space saved:", spaceBefore - spaceAfter, "bytes");

    const survey = await program.account.survey.fetch(surveyPda);
    expect(survey.isPublished).to.equal(true);
    expect(survey.merkleRoot).to.not.deep.equal(new Array(32).fill(0)); // Should not be all zeros
    
    // Check that encrypted answers were cleared but commitments remain
    expect(survey.encryptedAnswers).to.have.length(0); // Should be empty after publishing
    expect(survey.commitments).to.have.length(10);      // Should still have commitments

    // Verify space was actually reduced
    // Each encrypted answer is 256 bytes, so we should save 10 * 256 = 2560 bytes
    const expectedSpaceSaved = 10 * 256;
    expect(spaceBefore - spaceAfter).to.equal(expectedSpaceSaved);
    console.log(`✅ Successfully reclaimed ${expectedSpaceSaved} bytes by clearing encrypted answers`);
  });

  it("Prevents submitting to published survey", async () => {
    const newUser = Keypair.generate();
    
    const signature = await provider.connection.requestAirdrop(
      newUser.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction({
      signature,
      blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    });

    const commitment = Array.from(new Uint8Array(32).fill(99));
    const encryptedAnswer = Array.from(new Uint8Array(256).fill(99));

    try {
      await program.methods
        .submitResponse(commitment, encryptedAnswer)
        .accounts({
          survey: surveyPda,
          user: newUser.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([newUser])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.toString()).to.include("SurveyAlreadyPublished");
    }
  });

  it("Prevents unauthorized publishing", async () => {
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

    // Try to create a new survey with different survey_id
    const newSurveyId = "unauthorized-test";
    const [newSurveyPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("survey"),
        unauthorizedUser.publicKey.toBuffer(),
        Buffer.from(newSurveyId)
      ],
      program.programId
    );

    // Create survey with unauthorized user
    await program.methods
      .createSurvey(
        newSurveyId,
        "Unauthorized Survey",
        "Should fail to publish by wrong authority",
        blindSignaturePublicKey,
        encryptionPublicKey
      )
      .accounts({
        survey: newSurveyPda,
        authority: unauthorizedUser.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([unauthorizedUser])
      .rpc();

    // Try to publish with original wallet (should fail)
    try {
      await program.methods
        .publishResults()
        .accounts({
          survey: newSurveyPda,
          authority: wallet.publicKey, // Wrong authority
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
      expect.fail("Should have thrown an unauthorized error");
    } catch (error) {
      expect(error.toString()).to.include("Unauthorized");
    }
  });
});