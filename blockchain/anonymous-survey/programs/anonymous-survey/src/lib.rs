use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

declare_id!("mNtgDCdiUe415LDYWgD1n8zuLiPVmgqSdbUL1zHtaLq");

#[program]
pub mod anonymous_survey {
    use super::*;

    pub fn create_survey(
        ctx: Context<CreateSurvey>,
        survey_id: String,
        title: String,
        description: String,
        blind_signature_public_key: Vec<u8>,
        encryption_public_key: Vec<u8>,
    ) -> Result<()> {
        // Requirements
        require!(survey_id.len() <= 50, SurveyError::SurveyIdTooLong);
        require!(title.len() <= 100, SurveyError::TitleTooLong);
        require!(description.len() <= 500, SurveyError::DescriptionTooLong);
        require!(
            blind_signature_public_key.len() <= 300, // CORRECTED: RSA public keys are ~294 bytes
            SurveyError::PublicKeyTooLong
        );
        require!(
            encryption_public_key.len() <= 300, // CORRECTED: RSA public keys are ~294 bytes
            SurveyError::PublicKeyTooLong
        );

        // Init survey
        let survey = &mut ctx.accounts.survey;
        survey.authority = ctx.accounts.authority.key();
        survey.survey_id = survey_id;
        survey.title = title;
        survey.description = description;
        survey.total_responses = 0;
        survey.created_at = Clock::get()?.unix_timestamp;
        survey.updated_at = Clock::get()?.unix_timestamp;
        survey.is_published = false;
        survey.merkle_root = [0; 32];
        survey.encrypted_answers = Vec::new();
        survey.commitments = Vec::new();
        survey.blind_signature_public_key = blind_signature_public_key;
        survey.encryption_public_key = encryption_public_key;
        Ok(())
    }

    pub fn submit_response(
        ctx: Context<SubmitResponse>,
        commitment: [u8; 32],
        encrypted_answer: [u8; 256], // CORRECTED: RSA-2048 encrypted data is 256 bytes
    ) -> Result<()> {
        let survey = &mut ctx.accounts.survey;

        // Check if survey is already published
        require!(!survey.is_published, SurveyError::SurveyAlreadyPublished);

        // Check if survey has reached response limit
        require!(
            survey.commitments.len() < Survey::MAX_RESPONSES,
            SurveyError::SurveyFull
        );

        // Add commitment and encrypted answer to survey
        survey.commitments.push(commitment);
        survey.encrypted_answers.push(encrypted_answer);
        survey.total_responses = survey.total_responses.checked_add(1).unwrap();
        survey.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn publish_results(ctx: Context<PublishResults>) -> Result<()> {
        let survey = &mut ctx.accounts.survey;

        // Only authority can publish results
        require!(
            survey.authority == ctx.accounts.authority.key(),
            SurveyError::Unauthorized
        );

        // Verify survey is not already published
        require!(!survey.is_published, SurveyError::SurveyAlreadyPublished);

        // Calculate Merkle root from commitments
        let merkle_root = calculate_merkle_root(&survey.commitments);
        survey.merkle_root = merkle_root;
        survey.is_published = true;
        survey.updated_at = Clock::get()?.unix_timestamp;

        // Clear encrypted answers after publishing to free up space
        survey.encrypted_answers.clear();

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(survey_id: String)]
pub struct CreateSurvey<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Survey::LEN,
        seeds = [b"survey", authority.key().as_ref(), survey_id.as_bytes()],
        bump
    )]
    pub survey: Account<'info, Survey>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitResponse<'info> {
    #[account(
        mut,
        realloc = 8 + Survey::calculate_size_for_responses(survey.total_responses + 1),
        realloc::payer = user,
        realloc::zero = false
    )]
    pub survey: Account<'info, Survey>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishResults<'info> {
    #[account(
        mut,
        realloc = 8 + Survey::calculate_size_after_publishing(survey.total_responses),
        realloc::payer = authority,
        realloc::zero = false
    )]
    pub survey: Account<'info, Survey>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Survey {
    pub authority: Pubkey,
    pub survey_id: String,
    pub title: String,
    pub description: String,
    pub total_responses: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_published: bool,
    pub merkle_root: [u8; 32],
    pub encrypted_answers: Vec<[u8; 256]>, // RSA-2048 ciphertext is 256 bytes
    pub commitments: Vec<[u8; 32]>,        // Hash commitments are 32 bytes
    pub blind_signature_public_key: Vec<u8>, // RSA public key for blind signatures (~294 bytes)
    pub encryption_public_key: Vec<u8>,    // RSA public key for encryption (~294 bytes)
}

impl Survey {
    // Set response limit to 10-500
    pub const MAX_RESPONSES: usize = 10;

    // Base size without the dynamic vectors
    pub const BASE_LEN: usize = 32 +        // authority: Pubkey
        4 + 50 +    // survey_id: String (4 bytes length + 50 chars)
        4 + 100 +   // title: String (4 bytes length + 100 chars)
        4 + 500 +   // description: String (4 bytes length + 500 chars)
        4 +         // total_responses: u32
        8 +         // created_at: i64
        8 +         // updated_at: i64
        1 +         // is_published: bool
        32 +        // merkle_root: [u8; 32]
        4 +         // encrypted_answers: Vec header
        4 +         // commitments: Vec header
        4 + 300 +   // blind_signature_public_key: Vec<u8> (4 bytes length + 300 bytes)
        4 + 300; // encryption_public_key: Vec<u8> (4 bytes length + 300 bytes)
                 // TOTAL: 1363 bytes

    // Calculate total size for a given number of responses
    pub fn calculate_size_for_responses(num_responses: u32) -> usize {
        Self::BASE_LEN + (num_responses as usize * (256 + 32)) // 256 for encrypted_answer + 32 for commitment
    }
    // Calculate size after publishing (no encrypted answers, only commitments)
    pub fn calculate_size_after_publishing(num_responses: u32) -> usize {
        Self::BASE_LEN + (num_responses as usize * 32) // Only commitments remain (32 bytes each)
    }
    // Initial size with 0 responses
    pub const LEN: usize = Self::BASE_LEN;
}

#[error_code]
pub enum SurveyError {
    #[msg("Survey is already published")]
    SurveyAlreadyPublished,
    #[msg("Survey ID is too long")]
    SurveyIdTooLong,
    #[msg("Title is too long")]
    TitleTooLong,
    #[msg("Description is too long")]
    DescriptionTooLong,
    #[msg("Public key is too long")]
    PublicKeyTooLong,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Survey has reached maximum response limit")]
    SurveyFull,
}

// Helper function to calculate Merkle root
fn calculate_merkle_root(commitments: &Vec<[u8; 32]>) -> [u8; 32] {
    if commitments.is_empty() {
        return [0; 32];
    }

    let mut current_level = commitments.clone();

    while current_level.len() > 1 {
        let mut next_level = Vec::new();
        for i in (0..current_level.len()).step_by(2) {
            if i + 1 < current_level.len() {
                let combined = [&current_level[i][..], &current_level[i + 1][..]].concat();
                next_level.push(hash(&combined).to_bytes());
            } else {
                next_level.push(current_level[i]);
            }
        }
        current_level = next_level;
    }

    current_level[0]
}
