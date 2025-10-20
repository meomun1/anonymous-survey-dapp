use anchor_lang::prelude::*;

declare_id!("mNtgDCdiUe415LDYWgD1n8zuLiPVmgqSdbUL1zHtaLq");

#[program]
pub mod anonymous_survey {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: String,
        semester: String,
        campaign_type: u8,
        blind_signature_public_key: Vec<u8>,
        encryption_public_key: Vec<u8>,
    ) -> Result<()> {
        // Requirements
        require!(campaign_id.len() <= 50, CampaignError::CampaignIdTooLong);
        require!(semester.len() <= 20, CampaignError::SemesterTooLong);
        require!(campaign_type <= 1, CampaignError::InvalidCampaignType); // 0 = Course, 1 = Event
        require!(
            blind_signature_public_key.len() <= 300,
            CampaignError::PublicKeyTooLong
        );
        require!(
            encryption_public_key.len() <= 300,
            CampaignError::PublicKeyTooLong
        );

        // Init campaign
        let campaign = &mut ctx.accounts.campaign;
        campaign.authority = ctx.accounts.authority.key();
        campaign.campaign_id = campaign_id;
        campaign.semester = semester;
        campaign.campaign_type = campaign_type;
        campaign.total_responses = 0;
        campaign.created_at = Clock::get()?.unix_timestamp;
        campaign.updated_at = Clock::get()?.unix_timestamp;
        campaign.is_published = false;
        campaign.merkle_root = [0; 32];
        campaign.encrypted_responses = Vec::new();
        campaign.commitments = Vec::new();
        campaign.blind_signature_public_key = blind_signature_public_key;
        campaign.encryption_public_key = encryption_public_key;
        Ok(())
    }

    pub fn submit_batch_responses(
        ctx: Context<SubmitBatchResponses>,
        commitments: Vec<[u8; 32]>,
        encrypted_responses: Vec<[u8; 256]>,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        // Check if campaign is already published
        require!(
            !campaign.is_published,
            CampaignError::CampaignAlreadyPublished
        );

        // Only authority can submit batch responses
        require!(
            campaign.authority == ctx.accounts.authority.key(),
            CampaignError::Unauthorized
        );

        // Verify commitments and encrypted responses have same length
        require!(
            commitments.len() == encrypted_responses.len(),
            CampaignError::MismatchedDataLength
        );

        // Add all commitments and encrypted responses
        let response_count = encrypted_responses.len() as u32;
        campaign.commitments.extend(commitments);
        campaign.encrypted_responses.extend(encrypted_responses);
        campaign.total_responses = campaign
            .total_responses
            .checked_add(response_count)
            .unwrap();
        campaign.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn publish_campaign_results(
        ctx: Context<PublishCampaignResults>,
        merkle_root: [u8; 32], // Calculated off-chain by server from commitments
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        // Only authority can publish results
        require!(
            campaign.authority == ctx.accounts.authority.key(),
            CampaignError::Unauthorized
        );

        // Verify campaign is not already published
        require!(
            !campaign.is_published,
            CampaignError::CampaignAlreadyPublished
        );

        // Verify we have responses to publish
        require!(
            campaign.total_responses > 0,
            CampaignError::NoResponsesSubmitted
        );

        // Store the off-chain calculated Merkle root (from commitments)
        campaign.merkle_root = merkle_root;
        campaign.is_published = true;
        campaign.updated_at = Clock::get()?.unix_timestamp;

        // Clear encrypted responses to free up space (keep commitments)
        campaign.encrypted_responses.clear();

        Ok(())
    }

    pub fn update_final_merkle_root(
        ctx: Context<UpdateFinalMerkleRoot>,
        final_merkle_root: [u8; 32], // Calculated off-chain from all campaign roots
    ) -> Result<()> {
        let final_root = &mut ctx.accounts.final_root;

        // Only authority can update final root
        require!(
            final_root.authority == ctx.accounts.authority.key(),
            CampaignError::Unauthorized
        );

        // Update the final Merkle root (calculated off-chain from all campaign roots)
        final_root.final_merkle_root = final_merkle_root;
        final_root.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn initialize_final_root(
        ctx: Context<InitializeFinalRoot>,
        university_id: String,
    ) -> Result<()> {
        let final_root = &mut ctx.accounts.final_root;

        final_root.authority = ctx.accounts.authority.key();
        final_root.university_id = university_id;
        final_root.total_campaigns = 0;
        final_root.created_at = Clock::get()?.unix_timestamp;
        final_root.updated_at = Clock::get()?.unix_timestamp;
        final_root.final_merkle_root = [0; 32]; // Will be calculated off-chain

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(campaign_id: String, semester: String)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SurveyCampaign::calculate_size_for_responses(10), // Pre-allocate space for 10 responses
        seeds = [b"campaign", authority.key().as_ref(), campaign_id.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, SurveyCampaign>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitBatchResponses<'info> {
    #[account(mut)]
    pub campaign: Account<'info, SurveyCampaign>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishCampaignResults<'info> {
    #[account(mut)]
    pub campaign: Account<'info, SurveyCampaign>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(university_id: String)]
pub struct InitializeFinalRoot<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + UniversityPerformance::LEN,
        seeds = [b"university_performance", university_id.as_bytes()],
        bump
    )]
    pub final_root: Account<'info, UniversityPerformance>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateFinalMerkleRoot<'info> {
    #[account(mut)]
    pub final_root: Account<'info, UniversityPerformance>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct SurveyCampaign {
    pub authority: Pubkey,
    pub campaign_id: String,
    pub semester: String,
    pub campaign_type: u8, // 0 = Course, 1 = Event
    pub total_responses: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_published: bool,
    pub merkle_root: [u8; 32], // Calculated off-chain during publishing
    pub encrypted_responses: Vec<[u8; 256]>, // RSA-2048 encrypted responses (cleared after publishing)
    pub commitments: Vec<[u8; 32]>,          // Hash commitments (kept after publishing)
    pub blind_signature_public_key: Vec<u8>, // RSA public key for blind signatures (~294 bytes)
    pub encryption_public_key: Vec<u8>,      // RSA public key for encryption (~294 bytes)
}

#[account]
pub struct UniversityPerformance {
    pub authority: Pubkey,
    pub university_id: String,
    pub total_campaigns: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub final_merkle_root: [u8; 32], // Root of all campaign roots (calculated off-chain)
}

impl SurveyCampaign {
    // Base size without dynamic vectors
    pub const BASE_LEN: usize = 32 +        // authority: Pubkey
        4 + 50 +    // campaign_id: String (4 bytes length + 50 chars)
        4 + 20 +    // semester: String (4 bytes length + 20 chars)
        1 +         // campaign_type: u8
        4 +         // total_responses: u32
        8 +         // created_at: i64
        8 +         // updated_at: i64
        1 +         // is_published: bool
        32 +        // merkle_root: [u8; 32]
        4 +         // encrypted_responses: Vec header
        4 +         // commitments: Vec header
        4 + 300 +   // blind_signature_public_key: Vec<u8> (4 bytes length + 300 bytes)
        4 + 300; // encryption_public_key: Vec<u8> (4 bytes length + 300 bytes)
                 // TOTAL: 772 bytes base

    // Calculate total size for a given number of responses
    pub fn calculate_size_for_responses(num_responses: u32) -> usize {
        Self::BASE_LEN + (num_responses as usize * (256 + 32)) // 256 for encrypted_response + 32 for commitment
    }

    // Calculate size after publishing (no encrypted responses, only commitments)
    pub fn calculate_size_after_publishing(num_responses: u32) -> usize {
        Self::BASE_LEN + (num_responses as usize * 32) // Only commitments remain (32 bytes each)
    }

    // Initial size with 0 responses
    pub const LEN: usize = Self::BASE_LEN;
}

impl UniversityPerformance {
    // Base size for UniversityPerformance account
    pub const BASE_LEN: usize = 32 +        // authority: Pubkey
        4 + 50 +    // university_id: String (4 bytes length + 50 chars)
        4 +         // total_campaigns: u32
        8 +         // created_at: i64
        8 +         // updated_at: i64
        32; // final_merkle_root: [u8; 32]

    // Fixed size for UniversityPerformance account (no dynamic vectors)
    pub const LEN: usize = Self::BASE_LEN;
}

#[error_code]
pub enum CampaignError {
    #[msg("Campaign is already published")]
    CampaignAlreadyPublished,
    #[msg("Campaign ID is too long")]
    CampaignIdTooLong,
    #[msg("Semester is too long")]
    SemesterTooLong,
    #[msg("Invalid campaign type")]
    InvalidCampaignType,
    #[msg("Public key is too long")]
    PublicKeyTooLong,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("No responses submitted")]
    NoResponsesSubmitted,
    #[msg("Mismatched data length")]
    MismatchedDataLength,
}

// Note: Merkle root calculation is now done off-chain on the server
// to avoid Solana compute limits for large numbers of responses (34,000+)
