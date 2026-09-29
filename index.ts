import { TrustpilotReviewsScraper } from './nodes/TrustpilotReviewsScraper/TrustpilotReviewsScraper.node';
import { ApifyApi } from './credentials/ApifyApi.credentials';

export const nodeTypes = [TrustpilotReviewsScraper];

export const credentialTypes = [ApifyApi];
