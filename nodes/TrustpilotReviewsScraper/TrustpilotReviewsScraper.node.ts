import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { OptionField } from './GenericFunctions';
import { applyOptions, requireString, runActorAndGetItems } from './GenericFunctions';

// ScrapeUnblocker's public "Trustpilot Reviews Scraper" Actor: https://apify.com/scrapeunblocker/trustpilot-scraper
const ACTOR_ID = 'eWM4Buz5IE0v70CUh';
const INTEGRATION_APP_ID = 'scrapeunblocker-trustpilot-scraper';

// Node option name -> Actor input key.
const OPTION_FIELDS: Record<string, OptionField> = {
	stars: {
		key: 'stars',
	},
	sort: {
		key: 'sort',
	},
	date: {
		key: 'date',
	},
	language: {
		key: 'language',
	},
	search: {
		key: 'search',
	},
	verified: {
		key: 'verified',
	},
	replies: {
		key: 'replies',
	},
	proxyCountry: {
		key: 'proxy_country',
		kind: 'upper',
	},
};

function buildActorInput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const input: IDataObject = {};

	switch (`${resource}:${operation}`) {
		case 'review:getAll': {
			input.company = requireString.call(this, 'company', 'Company Domain', itemIndex);
			input.max_reviews = this.getNodeParameter('maxReviews', itemIndex);
			break;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
				{ itemIndex },
			);
	}

	applyOptions(input, options, OPTION_FIELDS);
	return input;
}

export class TrustpilotReviewsScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Trustpilot Reviews Scraper',
		name: 'trustpilotReviewsScraper',
		icon: {
			light: 'file:trustpilotReviewsScraper.png',
			dark: 'file:trustpilotReviewsScraper.dark.png',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: "Get a company's Trustpilot reviews with the ScrapeUnblocker Actor on Apify",
		defaults: {
			name: 'Trustpilot Reviews Scraper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'apifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Review',
						value: 'review',
					},
				],
				default: 'review',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['review'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get the Trustpilot reviews of one company',
						action: 'Get many reviews',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Company Domain',
				name: 'company',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'www.nike.com',
				description:
					"The reviewed company's domain, e.g. 'www.nike.com' or 'nike.com'. A full site URL or a Trustpilot review page URL also works.",
				displayOptions: {
					show: {
						resource: ['review'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Max Reviews',
				name: 'maxReviews',
				type: 'number',
				typeOptions: {
					minValue: 20,
					maxValue: 2000,
				},
				default: 100,
				description:
					'How many reviews to collect across pages (20 per page, 20-2000). Paging stops earlier when Trustpilot runs out.',
				displayOptions: {
					show: {
						resource: ['review'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Date Window',
						name: 'date',
						type: 'options',
						options: [
							{
								name: 'All Time',
								value: '',
							},
							{
								name: 'Last 12 Months',
								value: 'last12months',
							},
							{
								name: 'Last 3 Months',
								value: 'last3months',
							},
							{
								name: 'Last 30 Days',
								value: 'last30days',
							},
							{
								name: 'Last 6 Months',
								value: 'last6months',
							},
						],
						default: '',
						description: 'Only reviews from this recent period',
					},
					{
						displayName: 'Keyword',
						name: 'search',
						type: 'string',
						default: '',
						placeholder: 'delivery',
						description: 'Only reviews that mention this keyword',
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						placeholder: 'en',
						description:
							'Only reviews in this language, as an ISO-2 code (e.g. en, de). Leave empty for all languages.',
					},
					{
						displayName: 'Proxy Country',
						name: 'proxyCountry',
						type: 'string',
						default: '',
						placeholder: 'US',
						description: 'Exit-IP country (ISO-2, e.g. US). Leave empty for automatic choice.',
					},
					{
						displayName: 'Sort By',
						name: 'sort',
						type: 'options',
						options: [
							{
								name: 'Most Recent',
								value: 'recency',
							},
							{
								name: 'Most Relevant',
								value: 'relevancy',
							},
						],
						default: 'recency',
						description: 'Order of the reviews',
					},
					{
						displayName: 'Star Rating',
						name: 'stars',
						type: 'options',
						options: [
							{
								name: '1 Star',
								value: '1',
							},
							{
								name: '2 Stars',
								value: '2',
							},
							{
								name: '3 Stars',
								value: '3',
							},
							{
								name: '4 Stars',
								value: '4',
							},
							{
								name: '5 Stars',
								value: '5',
							},
							{
								name: 'Any',
								value: '',
							},
						],
						default: '',
						description: 'Only reviews with this star rating',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Maximum run time of the Apify Actor run. 0 keeps the Actor default. A run that times out fails the node.',
					},
					{
						displayName: 'Verified Only',
						name: 'verified',
						type: 'boolean',
						default: false,
						description: "Whether to return only reviews with Trustpilot's verified badge",
					},
					{
						displayName: 'With Company Reply Only',
						name: 'replies',
						type: 'boolean',
						default: false,
						description: 'Whether to return only reviews the company has replied to',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const { timeout, ...actorOptions } = options;

				const input = buildActorInput.call(this, resource, operation, actorOptions, i);
				const { items: results } = await runActorAndGetItems.call(this, {
					actorId: ACTOR_ID,
					integrationAppId: INTEGRATION_APP_ID,
					input,
					itemIndex: i,
					timeoutSecs: (timeout as number) || undefined,
				});

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return an error of their own class unchanged.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
