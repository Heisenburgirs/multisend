import defaultTokenIcon from '../../public/default-token-icon.png';

// Types for the token data
type TokenIcon = {
  url: string;
};

type TokenAsset = {
  id: string;
  standard: string;
  name: string;
  description: string;
  lsp4TokenName: string;
  lsp4TokenSymbol: string;
  lsp4TokenType: string;
  decimals: number;
  totalSupply: string;
  isLSP7: boolean;
  icons: TokenIcon[];
  images: TokenIcon[];
};

type TokenAttribute = {
  key: string;
  value: string;
  attributeType: string;
};

type TokenItem = {
  id: string;
  tokenId: string;
  formattedTokenId: string;
  name: string;
  description: string;
  lsp4TokenName: string;
  lsp4TokenSymbol: string;
  lsp4TokenType: string;
  baseAsset: {
    id: string;
    totalSupply: string;
  };
  icons: TokenIcon[];
  images: TokenIcon[];
  attributes: TokenAttribute[];
};

type TokenHolding = {
  balance: string;
  asset: TokenAsset;
  token: TokenItem;
};

type TokenHoldingsData = {
  Profile: {
    holds: TokenHolding[];
  }[];
};

export const getAssetSymbol = (holding: TokenHolding) => {
	if (isNFT(holding)) {
		return holding.token.lsp4TokenSymbol || 'UPN';
	} else {
		return holding.asset.lsp4TokenSymbol || 'Symbol N/A';
	}
};

// Format balance with decimals
const formatBalance = (balance: string, decimals: number = 18) => {
	if (!balance) return '0';
	
	// Convert from wei
	const num = parseInt(balance, 10) / Math.pow(10, decimals);
	
	// Format the number with commas for thousands separator and max 4 decimal places
	return num.toLocaleString(undefined, { 
		maximumFractionDigits: 4,
		minimumFractionDigits: 0
	});
};

export const getAssetBalance = (holding: TokenHolding) => {
	if (isNFT(holding)) {
		return holding.token.formattedTokenId || holding.token.tokenId || 'UPN';
	} else {
		return formatBalance(holding.balance, holding.asset.decimals);
	}
};


export function getTokenIcon(item: any): string {
	const convertIpfsUrl = (url: string) => {
		if (url.startsWith('ipfs://')) {
			return url.replace('ipfs://', 'https://api.universalprofile.cloud/ipfs/');
		}
		return url;
	};

	if (item.icons && item.icons.length > 0) {
		return convertIpfsUrl(item.icons[0].url);
	}
	
	if (item.images && item.images.length > 0) {
		return convertIpfsUrl(item.images[0].url);
	}
	
	return defaultTokenIcon.src;
}

export const isNFT = (holding: TokenHolding) => {
	return holding.token && holding.token.id;
};

export const getAssetName = (holding: TokenHolding) => {
	if (isNFT(holding)) {
		return holding.token.name || holding.token.lsp4TokenName || 'Unnamed NFT';
	} else {
		return holding.asset.lsp4TokenName || holding.asset.name || 'Unknown Token';
	}
};