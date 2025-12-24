/**
 * Script to reinitialize a campaign on blockchain
 * Use this when a campaign was created but blockchain init failed
 */
import db from '../config/database';
import { BlockchainService } from '../services/blockchain.service';

const campaignId = process.argv[2];

if (!campaignId) {
  console.error('Usage: npx ts-node src/scripts/reinit-blockchain-campaign.ts <campaignId>');
  process.exit(1);
}

async function reinitCampaign() {
  try {
    console.log(`Reinitializing campaign ${campaignId} on blockchain...`);

    // Check if campaign exists
    const result = await db.query(
      'SELECT id, blockchain_signature FROM survey_campaigns WHERE id = $1',
      [campaignId]
    );

    if (result.rowCount === 0) {
      console.error('Campaign not found');
      process.exit(1);
    }

    const campaign = result.rows[0];

    if (campaign.blockchain_signature) {
      console.warn(`⚠️  Campaign already has blockchain signature: ${campaign.blockchain_signature}`);
      console.log('Do you want to reinitialize? This might fail if account already exists.');
    }

    // Initialize on blockchain
    const blockchainService = new BlockchainService();
    const signature = await blockchainService.initializeCampaign(campaignId);

    // Update database
    await db.query(
      'UPDATE survey_campaigns SET blockchain_signature = $1 WHERE id = $2',
      [signature, campaignId]
    );

    console.log(`✅ Campaign initialized on blockchain`);
    console.log(`   Signature: ${signature}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to reinitialize campaign:', error);
    process.exit(1);
  }
}

reinitCampaign();
