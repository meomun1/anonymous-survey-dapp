use anchor_lang::prelude::*;

declare_id!("mNtgDCdiUe415LDYWgD1n8zuLiPVmgqSdbUL1zHtaLq");

#[program]
pub mod anonymous_survey {
    use super::*;

    /// Initialize a new campaign on blockchain
    /// Called by admin when creating a campaign in the database
    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        campaign_id: String,
    ) -> Result<()> {
        require!(campaign_id.len() <= 50, CampaignError::CampaignIdTooLong);

        let campaign = &mut ctx.accounts.campaign;
        campaign.admin = ctx.accounts.admin.key();
        campaign.campaign_id = campaign_id.clone();
        campaign.responses_merkle_root = None;
        campaign.total_responses = 0;
        campaign.claimed_receipts_root = None;
        campaign.claimed_count = 0;
        campaign.is_closed = false;
        campaign.created_at = Clock::get()?.unix_timestamp;
        campaign.updated_at = Clock::get()?.unix_timestamp;

        emit!(CampaignInitialized {
            campaign_id,
            admin: campaign.admin,
            timestamp: campaign.created_at,
        });

        Ok(())
    }

    /// Publish responses Merkle root (Merkle Tree #1)
    /// Called by admin after collecting all responses off-chain
    /// Server calculates Merkle root from response commitments in database
    pub fn publish_responses_merkle_root(
        ctx: Context<PublishResponsesRoot>,
        merkle_root: [u8; 32],
        total_responses: u32,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        // Only admin can publish
        require!(
            ctx.accounts.admin.key() == campaign.admin,
            CampaignError::Unauthorized
        );

        // Cannot publish if already closed
        require!(!campaign.is_closed, CampaignError::CampaignClosed);

        // Cannot publish if already published
        require!(
            campaign.responses_merkle_root.is_none(),
            CampaignError::AlreadyPublished
        );

        // Must have responses
        require!(total_responses > 0, CampaignError::NoResponses);

        campaign.responses_merkle_root = Some(merkle_root);
        campaign.total_responses = total_responses;
        campaign.updated_at = Clock::get()?.unix_timestamp;

        emit!(ResponsesMerkleRootPublished {
            campaign_id: campaign.campaign_id.clone(),
            merkle_root,
            total_responses,
            timestamp: campaign.updated_at,
        });

        Ok(())
    }

    /// Update claimed receipts Merkle root (Merkle Tree #2)
    /// Called by admin periodically to batch-publish new claims
    /// Server calculates Merkle root from receipt hashes in database
    pub fn update_claimed_receipts_root(
        ctx: Context<UpdateClaimedReceipts>,
        merkle_root: [u8; 32],
        claimed_count: u32,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        // Only admin can update
        require!(
            ctx.accounts.admin.key() == campaign.admin,
            CampaignError::Unauthorized
        );

        // Cannot update if closed
        require!(!campaign.is_closed, CampaignError::CampaignClosed);

        // Update Merkle root and count
        campaign.claimed_receipts_root = Some(merkle_root);
        campaign.claimed_count = claimed_count;
        campaign.updated_at = Clock::get()?.unix_timestamp;

        emit!(ClaimedReceiptsRootUpdated {
            campaign_id: campaign.campaign_id.clone(),
            merkle_root,
            claimed_count,
            timestamp: campaign.updated_at,
        });

        Ok(())
    }

    /// Close campaign (prevents further updates)
    /// Called by admin when campaign is complete
    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        // Only admin can close
        require!(
            ctx.accounts.admin.key() == campaign.admin,
            CampaignError::Unauthorized
        );

        // Cannot close if already closed
        require!(!campaign.is_closed, CampaignError::CampaignClosed);

        campaign.is_closed = true;
        campaign.updated_at = Clock::get()?.unix_timestamp;

        emit!(CampaignClosed {
            campaign_id: campaign.campaign_id.clone(),
            timestamp: campaign.updated_at,
        });

        Ok(())
    }
}

// ============================================================================
// ACCOUNT CONTEXTS
// ============================================================================

#[derive(Accounts)]
#[instruction(campaign_id: String)]
pub struct InitializeCampaign<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Campaign::LEN,
        seeds = [b"campaign", campaign_id.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishResponsesRoot<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateClaimedReceipts<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub admin: Signer<'info>,
}

// ============================================================================
// ACCOUNT STRUCTURES
// ============================================================================

#[account]
pub struct Campaign {
    pub admin: Pubkey,                              // 32 bytes
    pub campaign_id: String,                        // 4 + 50 = 54 bytes
    pub responses_merkle_root: Option<[u8; 32]>,    // 1 + 32 = 33 bytes (Merkle Tree #1)
    pub total_responses: u32,                       // 4 bytes
    pub claimed_receipts_root: Option<[u8; 32]>,    // 1 + 32 = 33 bytes (Merkle Tree #2)
    pub claimed_count: u32,                         // 4 bytes
    pub is_closed: bool,                            // 1 byte
    pub created_at: i64,                            // 8 bytes
    pub updated_at: i64,                            // 8 bytes
}

impl Campaign {
    // Fixed account size calculation
    pub const LEN: usize = 32 +      // admin: Pubkey
        4 + 50 +  // campaign_id: String (4 bytes length + max 50 chars)
        1 + 32 +  // responses_merkle_root: Option<[u8; 32]>
        4 +       // total_responses: u32
        1 + 32 +  // claimed_receipts_root: Option<[u8; 32]>
        4 +       // claimed_count: u32
        1 +       // is_closed: bool
        8 +       // created_at: i64
        8;        // updated_at: i64
                  // TOTAL: 177 bytes (fixed size!)
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct CampaignInitialized {
    pub campaign_id: String,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ResponsesMerkleRootPublished {
    pub campaign_id: String,
    pub merkle_root: [u8; 32],
    pub total_responses: u32,
    pub timestamp: i64,
}

#[event]
pub struct ClaimedReceiptsRootUpdated {
    pub campaign_id: String,
    pub merkle_root: [u8; 32],
    pub claimed_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct CampaignClosed {
    pub campaign_id: String,
    pub timestamp: i64,
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum CampaignError {
    #[msg("Campaign ID is too long (max 50 characters)")]
    CampaignIdTooLong,
    #[msg("Unauthorized: Only admin can perform this action")]
    Unauthorized,
    #[msg("Campaign is closed and cannot be modified")]
    CampaignClosed,
    #[msg("Responses Merkle root already published")]
    AlreadyPublished,
    #[msg("No responses to publish")]
    NoResponses,
}
