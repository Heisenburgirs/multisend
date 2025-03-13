'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { request, gql } from 'graphql-request';
import { useUpProvider } from './upProvider';
import makeBlockie from 'ethereum-blockies-base64';
import defaultTokenIcon from '../../public/default-token-icon.png';
import { ERC725 } from '@erc725/erc725.js';
import erc725schema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';
import Image from 'next/image';
import logo from '../../public/logo.png';
import { ethers } from 'ethers';
import { lukso } from "viem/chains";
import { createPublicClient, encodeFunctionData, http, parseUnits } from "viem";
import { toast } from "sonner"

// Constants for API endpoints
const ENVIO_MAINNET_URL = 'https://envio.lukso-mainnet.universal.tech/v1/graphql';
const IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';
const RPC_ENDPOINT_MAINNET = 'https://rpc.mainnet.lukso.network';

// Types from TokenHoldings
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

// Profile type for recipient search
type Profile = {
  name?: string;
  id: string;
  fullName?: string;
  profileImages?: {
    width: number;
    src: string;
    url: string;
    verified: boolean;
  }[];
};

type SelectedAsset = {
  asset: TokenHolding;
  type: 'token' | 'nft';
};

// New type to track collection selection
type CollectionSelection = {
  collectionId: string;
  collectionName: string;
  tokenCount: number;
  tokens: TokenHolding[];
};

// GraphQL Queries
const GET_PROFILE_TOKEN_HOLDINGS = gql`
  query GetProfileTokenHoldings($profileAddress: String!) {
    Profile(where: { id: { _ilike: $profileAddress } }) {
      holds {
        balance
        asset {
          id
          standard
          name
          description
          lsp4TokenName
          lsp4TokenSymbol
          lsp4TokenType
          decimals
          totalSupply
          isLSP7
          icons {
            url
          }
          images {
            url
          }
        }
        token {
          id
          tokenId
          formattedTokenId
          name
          description
          lsp4TokenName
          lsp4TokenSymbol
          lsp4TokenType
          baseAsset {
            id
            totalSupply
          }
          icons {
            url
          }
          images {
            url
          }
          attributes {
            key
            value
            attributeType
          }
        }
      }
    }
  }
`;

const PROFILE_SEARCH_QUERY = gql`
  query MyQuery($id: String!) {
    search_profiles(args: { search: $id }) {
      name
      fullName
      id
      profileImages(
        where: { error: { _is_null: true } }
        order_by: { width: asc }
      ) {
        width
        src
        url
        verified
      }
    }
  }
`;

// Add ABIs for the token contracts and UP
const LSP7_ABI = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "force", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    name: "transfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const LSP8_ABI = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "bytes32" },
      { name: "force", type: "bool" },
      { name: "data", type: "bytes" }
    ],
    name: "transfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const UP_ABI = [
  {
    inputs: [
      { name: "operationsType", type: "uint256[]" },
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "datas", type: "bytes[]" }
    ],
    name: "executeBatch",
    outputs: [{ name: "", type: "bytes[]" }],
    stateMutability: "payable",
    type: "function"
  }
];

export default function Home() {
  const { accounts, walletConnected, chainId, client } = useUpProvider();
  
  // State for recipient search
  const [recipient, setRecipient] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // State for asset selection
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const { setIsSearching } = useUpProvider();

  const [profileData, setProfileData] = useState<{
      imgUrl: string;
      fullName: string;
      background: string;
      profileAddress: string;
      isLoading: boolean;
  }>({
      imgUrl: 'https://tools-web-components.pages.dev/images/sample-avatar.jpg',
      fullName: 'username',
      background: 'https://tools-web-components.pages.dev/images/sample-background.jpg',
      profileAddress: '0x1234567890111213141516171819202122232425',
      isLoading: false,
  });

  // Additional state for recipient input
  const [inputValue, setInputValue] = useState('');
  const [isRecipientHovered, setIsRecipientHovered] = useState(false);
  const [isProfileSelected, setIsProfileSelected] = useState(false);
  const [isSearchingGlobally, setIsSearchingGlobally] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Profile | string | null>(null);
  
  // Additional state for asset selection
  const [selectedAssets, setSelectedAssets] = useState<{[key: number]: TokenHolding}>({});
  const [assetInputs, setAssetInputs] = useState<{index: number}[]>([{index: 0}]);
  const [assetDropdownVisibility, setAssetDropdownVisibility] = useState<{[key: number]: boolean}>({});
  const [assetSearchTerms, setAssetSearchTerms] = useState<{[key: number]: string}>({});
  const [amounts, setAmounts] = useState<{[key: string]: string}>({});
  
  // Add this new state to store the full precision amounts for transactions
  const [actualAmounts, setActualAmounts] = useState<{[key: string]: string}>({});
  
  const assetInputRef = useRef<HTMLInputElement>(null);
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  
  // Add a new state for tracking final transaction data
  const [transactionData, setTransactionData] = useState<{
    assets: {
      [key: string]: {
        asset: TokenHolding;
        amount?: string;  // For LSP7 tokens
        tokenId?: string; // For LSP8 NFTs
      }
    }
  }>({ assets: {} });
  
  // Update transaction status to include signing state
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'signing' | 'pending' | 'success'>('idle');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  
  // Use ref for timer to properly clean up
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add this new state for collection selections
  const [selectedCollections, setSelectedCollections] = useState<{[key: number]: CollectionSelection}>({});
  
  // Format address for display (0x1234...5678)
  const formatAddressLong = (address: string) => {
    if (!address) return '';
    if (address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Special formatting for Burntpix
  const formatBurntpix = (address: string) => {
    if (!address) return '';
    if (isValidEthAddress(address)) {
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    return address;
  };
  
  // Check if string is valid Ethereum address
  const isValidEthAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
  
  // Handle input changes and trigger search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (!isProfileSelected) {
      if (value.length >= 3) {
        setIsSearchingGlobally(true);
        handleSearch(value, value.length === 3);
        setShowProfileDropdown(true);
      } else {
        setShowProfileDropdown(false);
        setSearchResults([]);
      }
    }
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    if (!isProfileSelected) {
      setShowProfileDropdown(true);
    }
  };
  
  // Handle recipient removal
  const handleRecipientRemoval = () => {
    setIsProfileSelected(false);
    setSelectedProfile(null);
    setSelectedWallet(null);
    setRecipient('');
    setInputValue('');
  };
  
  // Handle address selection
  const handleSelectAddress = (address: string) => {
    if (isValidEthAddress(address)) {
      setRecipient(address);
      setSelectedWallet(address);
      setInputValue(address);
      setIsProfileSelected(true);
      setShowProfileDropdown(false);
    }
  };
  
  // Handle profile selection
  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile);
    setRecipient(profile.id);
    setSelectedWallet(profile);
    setInputValue(profile.fullName || profile.name || formatAddressLong(profile.id));
    setIsProfileSelected(true);
    setShowProfileDropdown(false);
  };
  
  // Get profile image URL from IPFS hash or use blockies
  const getProfileImageUrl = (profile: Profile) => {
    if (profile.profileImages && profile.profileImages.length > 0) {
      const imageUrl = profile.profileImages[0].url;
      if (imageUrl.startsWith('ipfs://')) {
        return imageUrl.replace('ipfs://', IPFS_GATEWAY);
      }
      return imageUrl;
    }
    return makeBlockie(profile.id); // Generate blockies avatar for address
  };
  
  // Render an individual profile item in dropdown
  const renderProfileItem = (profile: Profile) => (
    <div 
      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-100"
      onClick={() => handleProfileSelect(profile)}
    >
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        <img
          src={getProfileImageUrl(profile)}
          alt={profile.fullName || profile.name || formatAddressLong(profile.id)}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = makeBlockie(profile.id);
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-satoshi-medium text-base text-neutral-700 truncate">
          {profile.fullName || profile.name || formatAddressLong(profile.id)}
        </p>
        <p className="font-satoshi-regular text-small text-neutral-400 truncate">
          {formatAddressLong(profile.id)}
        </p>
      </div>
    </div>
  );
  
  // Update search completion state
  useEffect(() => {
    if (searchResults.length > 0 || !inputValue || inputValue.length < 3) {
      setIsSearchingGlobally(false);
    }
  }, [searchResults, inputValue]);

  // Handle clicks outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
      async function fetchProfileImage() {
          if (!accounts[0]) return;

          setProfileData(prev => ({ ...prev, isLoading: true }));

          try {
              const config = { ipfsGateway: IPFS_GATEWAY };
              const rpcEndpoint = RPC_ENDPOINT_MAINNET;
              //console.log(rpcEndpoint);
              const profile = new ERC725(erc725schema, accounts[0], rpcEndpoint, config);
              const fetchedData = await profile.fetchData('LSP3Profile');

              //console.log(fetchedData);

              if (
                  fetchedData?.value &&
                  typeof fetchedData.value === 'object' &&
                  'LSP3Profile' in fetchedData.value
              ) {
                  const profileImagesIPFS = fetchedData.value.LSP3Profile.profileImage;
                  const fullName = fetchedData.value.LSP3Profile.name;
                  const profileBackground = fetchedData.value.LSP3Profile.backgroundImage;

                  setProfileData({
                      fullName: fullName || '',
                      imgUrl: profileImagesIPFS?.[0]?.url
                          ? profileImagesIPFS[0].url.replace('ipfs://', IPFS_GATEWAY)
                          : 'https://tools-web-components.pages.dev/images/sample-avatar.jpg',
                      background: profileBackground?.[0]?.url
                          ? profileBackground[0].url.replace('ipfs://', IPFS_GATEWAY)
                          : '',
                      profileAddress: accounts[0],
                      isLoading: false,
                  });
              }
          } catch (error) {
              console.error('Error fetching profile image:', error);
              setProfileData(prev => ({
                  ...prev,
                  isLoading: false,
              }));
          }
      }

      fetchProfileImage();
  }, [accounts[0], chainId]);

  // Extract fetchTokenHoldings function so it can be called independently
  const fetchTokenHoldings = async () => {
      if (!accounts || accounts.length === 0) {
        setHoldingsError("No wallet connected");
        setLoadingHoldings(false);
        return;
      }

      const profileAddress = accounts[0];
      setLoadingHoldings(true);
      setHoldingsError(null);

      try {
        const data = await request<TokenHoldingsData>(
          ENVIO_MAINNET_URL,
          GET_PROFILE_TOKEN_HOLDINGS,
          { profileAddress }
        );
        
        if (data.Profile && data.Profile.length > 0 && data.Profile[0].holds) {
          setHoldings(data.Profile[0].holds);
        } else {
          setHoldings([]);
        }
      } catch (err) {
        console.error('Error fetching token holdings:', err);
        setHoldingsError("Failed to fetch token holdings. Please try again later.");
      } finally {
        setLoadingHoldings(false);
      }
  };

  // Update useEffect to use the extracted function
  useEffect(() => {
    fetchTokenHoldings();
  }, [accounts, chainId]);

  // Handle profile search
  const handleSearch = useCallback(
    async (searchQuery: string, forceSearch: boolean = false) => {
      setSearchQuery(searchQuery);

      if (searchQuery.length < 3) {
        setSearchResults([]);
        setShowProfileDropdown(false);
        return;
      }

      if (searchQuery.length > 3 && !forceSearch) {
        return;
      }

      try {
        const { search_profiles: data } = await request<{ search_profiles: Profile[] }>(
          ENVIO_MAINNET_URL,
          PROFILE_SEARCH_QUERY,
          { id: searchQuery }
        );
        setSearchResults(data);
        setShowProfileDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      }
    },
    [chainId]
  );

  // Format token balance for display
  const formatBalance = (balance: string, decimals: number = 18, formatted: boolean = true) => {
    if (!balance) return '0';
    // Use a safe decimals value, default to 0 for NFTs
    const safeDecimals = decimals ?? 0;
    const num = parseInt(balance, 10) / Math.pow(10, safeDecimals);
    
    if (!formatted) {
      return num.toString();
    }
    
    return num.toLocaleString(undefined, { 
      maximumFractionDigits: 4,
      minimumFractionDigits: 0
    });
  };
  
  // Get token image URL
  const getTokenImageUrl = (holding: TokenHolding) => {
    if (holding.token && (holding.token.icons?.length > 0 || holding.token.images?.length > 0)) {
      const iconUrl = holding.token.icons?.[0]?.url || holding.token.images?.[0]?.url;
      if (iconUrl?.startsWith('ipfs://')) {
        return iconUrl.replace('ipfs://', IPFS_GATEWAY);
      }
      return iconUrl || defaultTokenIcon.src;
    }
    
    if (holding.asset && (holding.asset.icons?.length > 0 || holding.asset.images?.length > 0)) {
      const iconUrl = holding.asset.icons?.[0]?.url || holding.asset.images?.[0]?.url;
      if (iconUrl?.startsWith('ipfs://')) {
        return iconUrl.replace('ipfs://', IPFS_GATEWAY);
      }
      return iconUrl || defaultTokenIcon.src;
    }
    
    return defaultTokenIcon.src;
  };
  
  // Handle asset input focus
  const handleAssetInputFocus = (index: number) => {
    setAssetDropdownVisibility(prev => ({
      ...prev,
      [index]: true
    }));
  };
  
  // Handle asset input change for filtering
  const handleAssetInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    setAssetSearchTerms(prev => ({
      ...prev,
      [index]: value
    }));
  };
  
  // Handle selecting an asset
  const handleSelectAsset = (holding: TokenHolding, index: number) => {
    //console.log("Selected asset:", holding);
    setSelectedAssets(prev => ({
      ...prev,
      [index]: holding
    }));
    
    setAssetDropdownVisibility(prev => ({
      ...prev,
      [index]: false
    }));
    
    setAssetSearchTerms(prev => ({
      ...prev,
      [index]: ''
    }));
    
    // For LSP8 NFTs, automatically add to transaction data since they don't need an amount
    if (isLSP8NFT(holding)) {
      setTransactionData(prev => ({
        assets: {
          ...prev.assets,
          [holding.token.id]: {
            asset: holding,
            tokenId: holding.token.tokenId
          }
        }
      }));
    }
    // For LSP7, we'll wait for the user to input an amount
  };
  
  // Add a new asset input
  const addAssetInput = () => {
    const lastIndex = assetInputs.length > 0 
      ? assetInputs[assetInputs.length - 1].index 
      : -1;
    setAssetInputs(prev => [...prev, { index: lastIndex + 1 }]);
  };
  
  // Remove an asset input
  const handleAssetRemoval = (index: number) => {
    const assetToRemove = selectedAssets[index];
    const collectionToRemove = selectedCollections[index];
    
    // Clear the selected asset
    setSelectedAssets(prev => {
      const newSelectedAssets = { ...prev };
      delete newSelectedAssets[index];
      return newSelectedAssets;
    });
    
    // Clear the selected collection if any
    setSelectedCollections(prev => {
      const newSelectedCollections = { ...prev };
      delete newSelectedCollections[index];
      return newSelectedCollections;
    });
    
    // Also clear amount and transaction data
    if (assetToRemove) {
      if (isLSP7(assetToRemove)) {
        // Clear amounts
        setAmounts(prev => {
          const newAmounts = { ...prev };
          delete newAmounts[assetToRemove.asset.id];
          return newAmounts;
        });
        
        setActualAmounts(prev => {
          const newActualAmounts = { ...prev };
          delete newActualAmounts[assetToRemove.asset.id];
          return newActualAmounts;
        });
        
        // Clear from transaction data
        setTransactionData(prev => {
          const newData = { ...prev };
          delete newData.assets[assetToRemove.asset.id];
          return newData;
        });
      } 
      else if (isLSP8NFT(assetToRemove)) {
        // Clear from transaction data
        setTransactionData(prev => {
          const newData = { ...prev };
          delete newData.assets[assetToRemove.token.id];
          return newData;
        });
      }
    }
    
    // Handle collection removal
    if (collectionToRemove) {
      // Remove all tokens in this collection from transaction data
      setTransactionData(prev => {
        const newData = { ...prev };
        
        collectionToRemove.tokens.forEach(token => {
          if (isLSP8NFT(token) && token.token) {
            delete newData.assets[token.token.id];
          }
        });
        
        return newData;
      });
    }

    // Check if there are multiple inputs
    if (assetInputs.length > 1) {
      // If multiple inputs exist, remove this input regardless of index
      setAssetInputs(prev => {
        const filteredInputs = prev.filter(item => item.index !== index);
        
        // If we removed the first input, we need to ensure the remaining inputs
        // are properly ordered and have their state preserved
        if (index === 0 && filteredInputs.length > 0) {
          // Find the minimum index to be the new first input
          const newFirstIndex = Math.min(...filteredInputs.map(item => item.index));
          
          // Move state from the new first input to index 0
          // This is a complicated operation that requires updating all state objects
          // that are keyed by the input index
          const inputsToReturn = filteredInputs.map(item => {
            if (item.index === newFirstIndex) {
              return { index: 0 };
            }
            return item;
          });
          
          // We need to reorganize all the state objects to reflect this change
          setTimeout(() => {
            // Handle selected assets
            const newSelectedAssets: {[key: number]: TokenHolding} = {};
            Object.entries(selectedAssets).forEach(([key, value]) => {
              const keyNum = parseInt(key);
              if (keyNum === newFirstIndex) {
                newSelectedAssets[0] = value;
              } else if (keyNum !== index) {
                newSelectedAssets[keyNum] = value;
              }
            });
            setSelectedAssets(newSelectedAssets);
            
            // Handle selected collections
            const newSelectedCollections: {[key: number]: CollectionSelection} = {};
            Object.entries(selectedCollections).forEach(([key, value]) => {
              const keyNum = parseInt(key);
              if (keyNum === newFirstIndex) {
                newSelectedCollections[0] = value;
              } else if (keyNum !== index) {
                newSelectedCollections[keyNum] = value;
              }
            });
            setSelectedCollections(newSelectedCollections);
            
            // Handle search terms
            const newSearchTerms: {[key: number]: string} = {};
            Object.entries(assetSearchTerms).forEach(([key, value]) => {
              const keyNum = parseInt(key);
              if (keyNum === newFirstIndex) {
                newSearchTerms[0] = value;
              } else if (keyNum !== index) {
                newSearchTerms[keyNum] = value;
              }
            });
            setAssetSearchTerms(newSearchTerms);
            
            // Handle dropdown visibility
            const newDropdownVisibility: {[key: number]: boolean} = {};
            Object.entries(assetDropdownVisibility).forEach(([key, value]) => {
              const keyNum = parseInt(key);
              if (keyNum === newFirstIndex) {
                newDropdownVisibility[0] = value;
              } else if (keyNum !== index) {
                newDropdownVisibility[keyNum] = value;
              }
            });
            setAssetDropdownVisibility(newDropdownVisibility);
          }, 0);
          
          return inputsToReturn;
        }
        
        return filteredInputs;
      });
      
      // Clear search terms and dropdown visibility for this input
      setAssetSearchTerms(prev => {
        const newSearchTerms = { ...prev };
        delete newSearchTerms[index];
        return newSearchTerms;
      });
      
      setAssetDropdownVisibility(prev => {
        const newDropdownVisibility = { ...prev };
        delete newDropdownVisibility[index];
        return newDropdownVisibility;
      });
    }
    // If there's only one input, just clear it (already done above)
  };
  
  // Check if holding is an NFT with tokenID (LSP8)
  const isLSP8NFT = (holding: TokenHolding) => {
    return holding.token !== null && holding.token !== undefined;
  };

  // Check if holding is LSP7 (either fungible or non-fungible)
  const isLSP7 = (holding: TokenHolding) => {
    return holding.asset !== null && 
           holding.asset !== undefined && 
           holding.asset.isLSP7 === true &&
           !isLSP8NFT(holding);
  };

  // Modify the getFilteredAssets function to also exclude NFTs from selected collections
  const getFilteredAssets = (index: number) => {
    const searchTerm = assetSearchTerms[index]?.toLowerCase() || '';
    
    // Get all currently selected assets except the one in the current input
    const selectedAssetIds = Object.entries(selectedAssets)
      .filter(([key, _]) => parseInt(key) !== index)
      .map(([_, holding]) => {
        // For NFTs, use token.id as the identifier
        if (holding.token?.id) {
          return holding.token.id;
        }
        // For fungible tokens, use asset.id
        return holding.asset.id;
      });
    
    // Get all NFTs that are part of selected collections (except current input)
    const selectedCollectionNftIds: string[] = [];
    Object.entries(selectedCollections)
      .filter(([key, _]) => parseInt(key) !== index)
      .forEach(([_, collection]) => {
        collection.tokens.forEach(token => {
          if (token.token?.id) {
            selectedCollectionNftIds.push(token.token.id);
          }
        });
      });
    
    // Get all selected collection IDs to prevent selecting the same collection twice
    const selectedCollectionIds = Object.entries(selectedCollections)
      .filter(([key, _]) => parseInt(key) !== index)
      .map(([_, collection]) => collection.collectionId);
    
    // Filter by search term and exclude already selected assets and collections
    return holdings.filter(holding => {
      // Check if this asset is already selected in another input
      const assetId = holding.token?.id || holding.asset.id;
      if (selectedAssetIds.includes(assetId)) {
        return false;
      }
      
      // Check if this NFT is part of an already selected collection
      if (holding.token?.id && selectedCollectionNftIds.includes(holding.token.id)) {
        return false;
      }
      
      // Check if this collection is already selected
      if (holding.token?.baseAsset?.id && selectedCollectionIds.includes(holding.token.baseAsset.id)) {
        return false;
      }
      
      // Apply search term filtering
      if (!searchTerm) return true;
      
      const assetName = holding.asset?.lsp4TokenName?.toLowerCase() || '';
      const assetSymbol = holding.asset?.lsp4TokenSymbol?.toLowerCase() || '';
      const tokenName = holding.token?.lsp4TokenName?.toLowerCase() || '';
      const tokenSymbol = holding.token?.lsp4TokenSymbol?.toLowerCase() || '';
      const tokenId = holding.token?.formattedTokenId?.toLowerCase() || '';
      
      return assetName.includes(searchTerm) || 
             assetSymbol.includes(searchTerm) || 
             tokenName.includes(searchTerm) || 
             tokenSymbol.includes(searchTerm) || 
             tokenId.includes(searchTerm);
    });
  };

  // Handle clicks outside asset dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target as Node)) {
        setAssetDropdownVisibility({});
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add this new function to format display values with 2 decimal places rounded down
  const formatDisplayAmount = (amount: string) => {
    if (!amount) return '';
    const num = parseFloat(amount);
    // Math.floor with 100 multiplier to round down to 2 decimal places
    const roundedDown = Math.floor(num * 100) / 100;
    return roundedDown.toString();
  };

  // Add this helper function to format long token names
  const formatTokenName = (name: string, maxLength: number = 20) => {
    if (!name) return "Unknown";
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength)}...`;
  };

  // Update the amount input handler to also update transaction data
  const handleAmountChange = (inputValue: string, holding: TokenHolding) => {
    if (!isLSP7(holding)) return;
    
    // Update the displayed amount
    setAmounts(prev => ({
      ...prev,
      [holding.asset.id]: inputValue
    }));
    
    // Update the actual amount
    setActualAmounts(prev => ({
      ...prev,
      [holding.asset.id]: inputValue
    }));
    
    // Only add to transaction data if there's an amount
    if (inputValue && parseFloat(inputValue) > 0) {
      setTransactionData(prev => ({
        assets: {
          ...prev.assets,
          [holding.asset.id]: {
            asset: holding,
            amount: inputValue
          }
        }
      }));
    } else {
      // Remove from transaction data if amount is empty or zero
      setTransactionData(prev => {
        const newData = { ...prev };
        if (newData.assets[holding.asset.id]) {
          delete newData.assets[holding.asset.id];
        }
        return newData;
      });
    }
  };

  // Update the max button handler
  const handleMaxAmount = (holding: TokenHolding) => {
    if (!isLSP7(holding)) return;
    
    // Get the full precision value
    const fullMaxAmount = formatBalance(holding.balance, holding.asset.decimals, false);
    
    // Update the actual amount
    setActualAmounts(prev => ({
      ...prev,
      [holding.asset.id]: fullMaxAmount
    }));
    
    // Display a rounded down value with 2 decimal places
    setAmounts(prev => ({
      ...prev,
      [holding.asset.id]: formatDisplayAmount(fullMaxAmount)
    }));
    
    // Add to transaction data
    setTransactionData(prev => ({
      assets: {
        ...prev.assets,
        [holding.asset.id]: {
          asset: holding,
          amount: fullMaxAmount
        }
      }
    }));
  };

  // Also modify the groupNFTsByCollection function to filter out collections that are already selected
  // and apply search filtering
  const groupNFTsByCollection = useCallback(() => {
    const collections: {[key: string]: CollectionSelection} = {};
    
    // Get all selected collection IDs
    const selectedCollectionIds = Object.values(selectedCollections).map(collection => collection.collectionId);
    
    // Get current search term for filtering
    const activeIndex = assetDropdownVisibility[0] ? 0 : 
      parseInt(Object.keys(assetDropdownVisibility).find(key => assetDropdownVisibility[parseInt(key)]) || "0");
    const searchTerm = (assetSearchTerms[activeIndex] || '').toLowerCase();
    
    holdings.forEach(holding => {
      if (isLSP8NFT(holding) && holding.token && holding.token.baseAsset) {
        const collectionId = holding.token.baseAsset.id;
        
        // Skip if this collection is already selected
        if (selectedCollectionIds.includes(collectionId)) {
          return;
        }
        
        // Skip if this NFT is already individually selected
        const isNftSelected = Object.values(selectedAssets).some(asset => 
          asset.token && asset.token.id === holding.token.id
        );
        
        if (isNftSelected) {
          return;
        }
        
        // Create collection if it doesn't exist yet
        if (!collections[collectionId]) {
          collections[collectionId] = {
            collectionId,
            collectionName: holding.token.lsp4TokenName || "Unknown Collection",
            tokenCount: 0,
            tokens: []
          };
        }
        
        collections[collectionId].tokenCount++;
        collections[collectionId].tokens.push(holding);
      }
    });
    
    // Filter collections by search term if one exists
    if (searchTerm) {
      const filteredCollections: {[key: string]: CollectionSelection} = {};
      
      Object.entries(collections).forEach(([id, collection]) => {
        const collectionName = collection.collectionName.toLowerCase();
        
        // Check if collection name matches search term
        if (collectionName.includes(searchTerm)) {
          filteredCollections[id] = collection;
        }
      });
      
      return filteredCollections;
    }
    
    return collections;
  }, [holdings, selectedAssets, selectedCollections, assetSearchTerms, assetDropdownVisibility]);

  // Add this function to handle selecting an entire collection
  const handleSelectCollection = (collection: CollectionSelection, index: number) => {
    setSelectedCollections(prev => ({
      ...prev,
      [index]: collection
    }));
    
    setAssetDropdownVisibility(prev => ({
      ...prev,
      [index]: false
    }));
    
    // Add all tokens from this collection to the transaction data
    const updatedTransactionData = { ...transactionData };
    
    collection.tokens.forEach(holding => {
      if (isLSP8NFT(holding) && holding.token) {
        updatedTransactionData.assets[holding.token.id] = {
          asset: holding,
          tokenId: holding.token.tokenId
        };
      }
    });
    
    setTransactionData(updatedTransactionData);
  };

  // Reset function to clear all states after successful transaction
  const resetAfterSuccess = (immediate = false) => {
    // If immediate reset requested, clear timer and reset now
    if (immediate && redirectTimerRef.current) {
      clearInterval(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    
    // Only proceed with reset if immediate is true or countdown has finished
    if (immediate || redirectCountdown <= 0) {
      // Clear recipient data
      setRecipient('');
      setSelectedProfile(null);
      setSelectedWallet(null);
      setInputValue('');
      setIsProfileSelected(false);
      
      // Clear asset selection
      setSelectedAssets({});
      setSelectedCollections({}); // Clear collection selections
      setAssetInputs([{index: 0}]);
      setAssetDropdownVisibility({});
      setAssetSearchTerms({});
      setAmounts({});
      setActualAmounts({});
      
      // Clear transaction data
      setTransactionData({ assets: {} });
      
      // Reset transaction status
      setTransactionStatus('idle');
      setTransactionHash(null);
      setRedirectCountdown(5);
    }
  };
  
  // Effect to handle countdown after success
  useEffect(() => {
    if (transactionStatus === 'success') {
      // Start countdown timer
      redirectTimerRef.current = setInterval(() => {
        setRedirectCountdown(prev => {
          const newCount = prev - 1;
          if (newCount <= 0) {
            // When countdown reaches zero, clear timer and reset
            if (redirectTimerRef.current) {
              clearInterval(redirectTimerRef.current);
              redirectTimerRef.current = null;
            }
            resetAfterSuccess(true);
          }
          return newCount;
        });
      }, 1000);
    }
    
    // Cleanup timer on unmount or status change
    return () => {
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [transactionStatus]);

  const handleTransfer = async() => {
    //console.log('Transaction data:', transactionData);

    const { assets } = transactionData;

    if (!recipient) {
      toast.error("Recipient is required", {
        duration: 2000,
        position: "bottom-center",
      });
      return;
    }

    if (Object.keys(assets).length === 0) {
      toast.error("No assets selected for transfer", {
        duration: 2000,
        position: "bottom-center",
      });
      return;
    }
    
    if (!client || !accounts || accounts.length === 0) {
      toast.error("Wallet not connected properly", {
        duration: 2000,
        position: "bottom-center",
      });
      return;
    }
    
    // Prepare transaction data arrays for executeBatch
    const operationsType: number[] = [];
    const targets: `0x${string}`[] = [];
    const values: bigint[] = [];
    const datas: `0x${string}`[] = [];
    
    // Set transaction status to signing (waiting for wallet signature)
    setTransactionStatus('signing');
    
    try {
      // Process each asset to prepare transaction data
      for (const key in assets) {
        const { asset: holding, amount, tokenId } = assets[key];
        
        // Handle LSP7 token transfers
        if (isLSP7(holding) && amount) {
          // Convert amount to wei based on token decimals
          const decimals = holding.asset.decimals || 0;
          const amountInWei = parseUnits(amount, decimals);
          
          // Encode the transfer function call
          const data = encodeFunctionData({
            abi: LSP7_ABI,
            functionName: 'transfer',
            args: [
              accounts[0] as `0x${string}`, // from
              recipient as `0x${string}`,   // to
              amountInWei,                  // amount in wei
              true,                         // force
              '0x' as `0x${string}`         // empty data
            ]
          });
          
          // Add to transaction batch
          operationsType.push(0); // CALL operation
          targets.push(holding.asset.id as `0x${string}`);
          values.push(BigInt(0)); // No ETH value sent
          datas.push(data);
          
          //console.log(`Prepared LSP7 transfer: ${holding.asset.lsp4TokenName || "Token"}, Amount: ${amount}`);
        }
        
        // Handle LSP8 NFT transfers
        if (isLSP8NFT(holding) && tokenId) {
          // Encode the transfer function call
          const data = encodeFunctionData({
            abi: LSP8_ABI,
            functionName: 'transfer',
            args: [
              accounts[0] as `0x${string}`, // from
              recipient as `0x${string}`,   // to
              tokenId as `0x${string}`,     // tokenId
              true,                         // force
              '0x' as `0x${string}`         // empty data
            ]
          });
          
          // Add to transaction batch
          operationsType.push(0); // CALL operation
          targets.push(holding.token.baseAsset.id as `0x${string}`);
          values.push(BigInt(0)); // No ETH value sent
          datas.push(data);
          
          //console.log(`Prepared LSP8 transfer: ${holding.token.lsp4TokenName || "NFT"}, TokenId: ${tokenId}`);
        }
      }
      
      // Check if we have any transactions to execute
      if (operationsType.length === 0) {
        toast.error("No valid transactions to execute", {
          duration: 2000,
          position: "bottom-center",
        });
        setTransactionStatus('idle');
        return;
      }
      
      /*console.log('Executing batch transaction with:', {
        operationsType,
        targets,
        values,
        datas
      });*/
      
      // Execute the batch transaction
      const hash = await client.writeContract({
        address: accounts[0] as `0x${string}`, // Universal Profile address
        abi: UP_ABI,
        functionName: 'executeBatch',
        args: [operationsType, targets, values, datas],
        account: accounts[0] as `0x${string}`,
        chain: lukso
      });
      
      // Now that we have a hash, update to pending status
      setTransactionStatus('pending');
      setTransactionHash(hash);
      //console.log('Transaction submitted:', hash);
      
      // Wait for transaction confirmation
      const publicClient = createPublicClient({
        chain: lukso,
        transport: http(),
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      });

      //console.log('Transaction confirmed:', receipt);
      
      // If successful, update the UI directly
      if (receipt.status === 'success') {
        setTransactionStatus('success');
        setRedirectCountdown(5);
        toast.success("Transfer Successful", {
          duration: 3000,
          position: "bottom-center",
        });
        
        // Update holdings state directly instead of refetching
        setHoldings(prevHoldings => {
          // Create a deep copy of the holdings to avoid mutation
          const updatedHoldings = [...prevHoldings];
          
          // Process each transferred asset
          Object.values(transactionData.assets).forEach(({ asset: holding, amount, tokenId }) => {
            if (isLSP7(holding) && amount) {
              // For LSP7 tokens, update the balance
              const holdingIndex = updatedHoldings.findIndex(h => 
                h.asset.id === holding.asset.id
              );
              
              if (holdingIndex !== -1) {
                // Calculate new balance (current - transferred)
                const currentBalance = BigInt(updatedHoldings[holdingIndex].balance);
                const transferredAmount = parseUnits(amount, holding.asset.decimals || 0);
                const newBalance = currentBalance - transferredAmount;
                
                // Update the balance or remove if zero
                if (newBalance <= BigInt(0)) {
                  updatedHoldings.splice(holdingIndex, 1);
                } else {
                  updatedHoldings[holdingIndex] = {
                    ...updatedHoldings[holdingIndex],
                    balance: newBalance.toString()
                  };
                }
              }
            } 
            else if (isLSP8NFT(holding) && tokenId) {
              // For LSP8 NFTs, remove them completely
              const holdingIndex = updatedHoldings.findIndex(h => 
                h.token?.id === holding.token.id
              );
              
              if (holdingIndex !== -1) {
                updatedHoldings.splice(holdingIndex, 1);
              }
            }
          });
          
          return updatedHoldings;
        });
        
        // Reset the form
        resetAfterSuccess(true);
      } else {
        setTransactionStatus('idle');
        toast.error("Transfer Failed", {
          duration: 2000,
          position: "bottom-center",
        });
      }
      
    } catch (error) {
      console.error('Error executing transfer:', error);
      setTransactionStatus('idle');
      toast.error("Transfer Failed", {
        duration: 2000,
        position: "bottom-center",
      });
    }
  };

  // Conditional rendering based on transaction status
  if (transactionStatus !== 'idle') {
    return (
      <div className="h-[100vh] w-full font-satoshi-regular">
        <main className="w-full h-full flex justify-center items-center">
          <div className="max-w-[540px] h-full items-start justify-start mx-auto px-4 py-8 w-full">
            <div className="flex gap-[4px] justify-center items-center mb-2">
              <Image src={logo} alt="Defolio Logo" width={24} height={24} />
              <h1 className="text-[20px] font-satoshi-bold text-neutral-700 tracking-tight">
                Multisend
              </h1>
            </div>
            <div className="bg-neutral-0 rounded-200 shadow-bottom-200 p-6 flex flex-col items-center justify-center gap-6 min-h-[400px]">
              {transactionStatus === 'signing' && (
                // Signing state
                <div className="flex flex-col items-center gap-6 py-8">
                  <div className="w-16 h-16 border-t-4 border-b-4 border-primary-500 rounded-full animate-pulse"></div>
                  <h2 className="text-xl font-satoshi-medium text-neutral-700">Waiting for Signature</h2>
                  <p className="text-neutral-500 text-center max-w-xs">
                    Please confirm the transaction in your wallet...
                  </p>
                </div>
              )}
              
              {transactionStatus === 'pending' && (
                // Pending state
                <div className="flex flex-col items-center gap-6 py-8">
                  <div className="w-16 h-16 border-t-4 border-b-4 border-primary-500 rounded-full animate-spin"></div>
                  <h2 className="text-xl font-satoshi-medium text-neutral-700">Transaction in Progress</h2>
                  <p className="text-neutral-500 text-center max-w-xs">
                    Your transfer is being processed. Please wait a moment...
                  </p>
                  {transactionHash && (
                    <a 
                      href={`https://explorer.execution.mainnet.lukso.network/tx/${transactionHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:underline text-sm flex items-center gap-1"
                    >
                      View on Explorer
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  )}
                </div>
              )}
              
              {transactionStatus === 'success' && (
                // Success state
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h2 className="text-xl font-satoshi-medium text-neutral-700">Transfer Complete!</h2>
                  <div className="mt-4 flex flex-col items-center gap-6">
                    <button 
                      onClick={() => resetAfterSuccess(true)} 
                      className="px-6 py-3 bg-primary-500 text-white rounded-50 font-satoshi-medium hover:bg-primary-600 transition-colors"
                    >
                      Send More
                    </button>
                    <p className="text-sm text-neutral-400">
                      Redirecting in {redirectCountdown} seconds...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Original UI for idle state
  return (
    <div className="h-[100vh] w-full font-satoshi-regular">
      <main className="w-full h-full flex justify-center items-center">
        {!walletConnected ? (
          <div className="flex flex-col gap-6 justify-center items-center text-center px-4 py-8 bg-neutral-50 border border-neutral-200 rounded-50">
            <h1 className="text-header font-satoshi-bold text-neutral-700 tracking-tight">
              Multisend
            </h1>
            <p className="text-base font-satoshi-regular text-neutral-500 max-w-md leading-base">
              Click the connect button at the top left to get started
            </p>
            <div className="flex gap-[4px] justify-center items-center">
              <Image src={logo} alt="Defolio Logo" width={24} height={24} />
              <h1 className="text-sm font-satoshi-bold text-primary-500 tracking-tight">
                <span className="text-sm font-satoshi-regular text-neutral-500">Powered By </span> Defolio
              </h1>
            </div>
          </div>
        ) : (
          <div className="max-w-[540px] h-full items-start justify-start mx-auto px-4 py-8 w-full">
            <div className="flex gap-[4px] justify-center items-center mb-2">
              <Image src={logo} alt="Defolio Logo" width={24} height={24} />
              <h1 className="text-[20px] font-satoshi-bold text-neutral-700 tracking-tight">
                Multisend
              </h1>
            </div>
            <div className="bg-neutral-0 rounded-200 shadow-bottom-200 p-6 space-y-6">
              {/* Profile Section - you can add this if needed */}
              
              {/* Send To Input */}
              <div
                className={`relative flex h-[72px] w-full rounded-50 px-[12px] py-[16px] justify-between items-center
                border border-solid bg-neutral-50 border-neutral-200`}
                onMouseEnter={() => {
                  setIsRecipientHovered(true);
                }}
                onMouseLeave={() => {
                  setIsRecipientHovered(false);
                }}
              >
                {isProfileSelected && isRecipientHovered && (
                  <span
                    onClick={() => {
                      handleRecipientRemoval();
                    }}
                    className={`absolute right-[-10px] top-[-10px] hover:cursor-pointer bg-neutral-500 p-[2px] rounded-100 shadow-bottom-200 ${isRecipientHovered ? "opacity-100 transition" : "opacity-0 transition"} transition`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </span>
                )}

                <div ref={dropdownRef} className="flex justify-between items-center relative w-full">
                  <div className="flex flex-col gap-[2px] w-full h-full relative">
                    <span
                      className={`font-semibold text-base text-neutral-700 z-40`}
                      onClick={() => {}}
                    >
                      Send to
                    </span>

                    <input
                      type="text"
                      value={isProfileSelected ? inputValue : inputValue}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      placeholder="Address"
                      className={`outline-none bg-neutral-50 text-neutral-700 text-base`}
                    />
                  </div>

                  {isProfileSelected && selectedProfile && (
                    <img 
                      src={getProfileImageUrl(selectedProfile)}
                      alt={selectedProfile.fullName || selectedProfile.name || formatAddressLong(selectedProfile.id)} 
                      className="w-[40px] h-[40px] rounded-full mr-2" 
                    />
                  )}
                  
                  {isProfileSelected && typeof selectedWallet === 'string' && (
                    <img 
                      src={makeBlockie(selectedWallet)}
                      alt={`Identicon for ${selectedWallet}`} 
                      className="w-[40px] h-[40px] rounded-full mr-2" 
                    />
                  )}

                  {showProfileDropdown && (
                    <div className={`absolute z-50 top-0 w-[calc(100%+26px)] left-[-13px] mt-[70px] min-h-[70px] max-h-[250px] rounded-50 overflow-y-auto shadow-lg 
                    bg-neutral-50 border-neutral-200 border`}>
                      {inputValue.length < 3 ? (
                        <div className={`flex items-center min-h-[70px] px-[12px] py-[12px] text-neutral-500`}>
                          Type at least 3 characters to search
                        </div>
                      ) : (
                        <>
                          {searchResults.map((profile, index) => (
                            <div key={`profile-${index}`}>{renderProfileItem(profile)}</div>
                          ))}
                          {isSearchingGlobally && (
                            <div className={`px-[12px] flex items-center space-x-2 items-center min-h-[70px] text-neutral-500`}>
                              <div className="w-4 h-4 border-t-2 border-b-2 border-primary-500 rounded-full animate-spin"></div>
                              <span>Searching globally...</span>
                            </div>
                          )}
                          {!isSearchingGlobally && searchResults.length === 0 && isValidEthAddress(inputValue) && (
                            <div className={`min-h-[70px] flex flex-col gap-2 px-[12px] py-[12px] rounded-50 text-base overflow-hidden hover:cursor-pointer hover:bg-neutral-100 text-neutral-500`}
                              onClick={() => { handleSelectAddress(inputValue)}}
                            >
                              <span className={`font-semibold text-base text-neutral-500`}>EOA</span>
                              {formatAddressLong(inputValue)}
                            </div>
                          )}
                          {!isSearchingGlobally && searchResults.length === 0 && !isValidEthAddress(inputValue) && (
                            <div className={`flex items-center min-h-[70px] px-[12px] py-[12px] text-neutral-500`}>
                              No matching profiles found
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Asset Selection Inputs */}
              <div className="space-y-4">
                {assetInputs.map((input) => (
                  <div key={input.index} className="relative">
                    <div 
                      className={`relative flex h-[85px] w-full rounded-50 px-[12px] py-[16px] justify-between items-center
                      border border-solid bg-neutral-50 border-neutral-200`}
                    >
                      {/* Always show X button for selected assets or collections (not dependent on hover) */}
                      {(selectedAssets[input.index] || selectedCollections[input.index]) && (
                        <span
                          onClick={() => handleAssetRemoval(input.index)}
                          className={`absolute right-[-10px] top-[-10px] hover:cursor-pointer bg-neutral-500 p-[2px] rounded-100 shadow-bottom-200`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </span>
                      )}

                      <div className="flex justify-between items-center relative w-full">
                        <div className="flex flex-col gap-2 w-full h-full relative">
                          <span className="font-semibold text-base text-neutral-700">
                            Asset
                          </span>
                          
                          {!selectedAssets[input.index] && !selectedCollections[input.index] ? (
                            <input
                              type="text"
                              value={assetSearchTerms[input.index] || ''}
                              onChange={(e) => handleAssetInputChange(e, input.index)}
                              onFocus={() => handleAssetInputFocus(input.index)}
                              placeholder="Select an asset..."
                              className="outline-none bg-neutral-50 text-neutral-700 text-base"
                            />
                          ) : selectedCollections[input.index] ? (
                            // Display for selected collection
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={getTokenImageUrl(selectedCollections[input.index].tokens[0])}
                                    alt="Collection Icon"
                                    className="h-[24px] w-[24px] rounded-full"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = defaultTokenIcon.src;
                                    }}
                                  />
                                  <span className="text-neutral-700 text-base overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]">
                                    {formatTokenName(selectedCollections[input.index].collectionName)}
                                  </span>
                                </div>
                                <div className="text-xs text-neutral-400 mt-1">
                                  {selectedCollections[input.index].tokenCount} NFTs selected
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={getTokenImageUrl(selectedAssets[input.index])}
                                    alt="Asset Icon"
                                    className="h-[24px] w-[24px] rounded-full"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = defaultTokenIcon.src;
                                    }}
                                  />
                                  <span className="text-neutral-700 text-base overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]">
                                    {selectedAssets[input.index].token && selectedAssets[input.index].token.id
                                      ? formatTokenName(selectedAssets[input.index].token.lsp4TokenName || 
                                        formatAddressLong(selectedAssets[input.index].token.formattedTokenId) || 
                                        "Unknown NFT")
                                      : formatTokenName(selectedAssets[input.index].asset?.lsp4TokenName || "Unknown Token")}
                                  </span>
                                </div>
                                
                                {/* Show balance for all LSP7 tokens */}
                                {isLSP7(selectedAssets[input.index]) && <div className="text-xs text-neutral-400 mt-1">
                                  Balance: {formatBalance(
                                    selectedAssets[input.index].balance, 
                                    selectedAssets[input.index].asset?.decimals || 0
                                  )}
                                </div>}
                              </div>
                              
                              {/* Show amount input for all LSP7 tokens (both fungible and non-fungible) */}
                              {isLSP7(selectedAssets[input.index]) && (
                                <div className="flex flex-col items-end">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      placeholder="0"
                                      className="w-24 text-right outline-none bg-neutral-50 text-neutral-700"
                                      value={amounts[selectedAssets[input.index].asset.id] || ''}
                                      onChange={(e) => {
                                        handleAmountChange(e.target.value, selectedAssets[input.index]);
                                      }}
                                    />
                                    <button 
                                      className="text-primary-500 text-sm font-satoshi-medium cursor-pointer"
                                      onClick={() => handleMaxAmount(selectedAssets[input.index])}
                                    >
                                      Max
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Asset dropdown */}
                      {assetDropdownVisibility[input.index] && (
                        <div ref={assetDropdownRef} className="absolute z-50 top-0 w-[calc(100%+2px)] left-[-1px] top-[15px] mt-[70px] min-h-[75px] max-h-[310px] rounded-50 overflow-y-auto shadow-lg bg-neutral-50 border-neutral-200 border">
                          {loadingHoldings ? (
                            <div className="flex items-center justify-center min-h-[75px]">
                              <div className="w-4 h-4 border-t-2 border-b-2 border-primary-500 rounded-full animate-spin mr-2"></div>
                              <span className="text-neutral-500">Loading assets...</span>
                            </div>
                          ) : holdings.length === 0 ? (
                            <div className="flex items-center justify-center min-h-[75px]">
                              <span className="text-neutral-500">No assets found</span>
                            </div>
                          ) : (
                            <>
                              {/* Collections section - group LSP8 NFTs by collection */}
                              {(() => {
                                const collections = groupNFTsByCollection();
                                return Object.values(collections).length > 0 ? (
                                  <>
                                    <div className="p-2 font-bold font-satoshi-medium text-base text-primary-500">
                                      Collections
                                    </div>
                                    {Object.values(collections).map((collection, idx) => (
                                      <div
                                        key={`collection-${idx}`}
                                        className="flex gap-[8px] p-2 cursor-pointer justify-between hover:bg-neutral-100"
                                        onClick={() => handleSelectCollection(collection, input.index)}
                                      >
                                        <div className="flex gap-[8px] items-center">
                                          <img
                                            src={getTokenImageUrl(collection.tokens[0])}
                                            alt={collection.collectionName}
                                            className="h-[24px] w-[24px] rounded-full"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.src = defaultTokenIcon.src;
                                            }}
                                          />
                                          <span className="text-neutral-700 overflow-hidden text-ellipsis whitespace-nowrap">
                                            {formatTokenName(collection.collectionName)}
                                          </span>
                                        </div>
                                        <span className="text-primary-500 font-satoshi-medium overflow-hidden text-ellipsis whitespace-nowrap">
                                          {collection.tokenCount} NFTs
                                        </span>
                                      </div>
                                    ))}
                                  </>
                                ) : null;
                              })()}

                              {/* LSP7 Tokens section - both fungible and non-fungible */}
                              {getFilteredAssets(input.index).filter(item => isLSP7(item)).length > 0 && (
                                <>
                                  <div className="p-2 font-bold font-satoshi-medium text-base text-primary-500">
                                    Assets
                                  </div>
                                  {getFilteredAssets(input.index)
                                    .filter(item => isLSP7(item))
                                    .map((item, idx) => (
                                      <div
                                        key={`token-${idx}`}
                                        className="flex gap-[8px] p-2 cursor-pointer justify-between hover:bg-neutral-100"
                                        onClick={() => handleSelectAsset(item, input.index)}
                                      >
                                        <div className="flex gap-[8px] items-center">
                                          <img
                                            src={getTokenImageUrl(item)}
                                            alt={item.asset.lsp4TokenName || "Token"}
                                            className="h-[24px] w-[24px] rounded-full"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.src = defaultTokenIcon.src;
                                            }}
                                          />
                                          <span className="text-neutral-700 overflow-hidden text-ellipsis whitespace-nowrap">
                                            {formatTokenName(item.asset.lsp4TokenName || "Unknown Token")}
                                          </span>
                                        </div>
                                        <span className="text-neutral-700 overflow-hidden text-ellipsis whitespace-nowrap">
                                          {formatBalance(item.balance, item.asset.decimals)}
                                        </span>
                                      </div>
                                    ))}
                                </>
                              )}

                              {/* LSP8 NFTs section - items with token.id field */}
                              {getFilteredAssets(input.index).filter(item => isLSP8NFT(item)).length > 0 && (
                                <>
                                  <div className="p-2 font-bold font-satoshi-medium text-base text-primary-500">
                                    NFT
                                  </div>
                                  {getFilteredAssets(input.index)
                                    .filter(item => isLSP8NFT(item))
                                    .map((item, idx) => (
                                      <div
                                        key={`nft-${idx}`}
                                        className="flex gap-[8px] p-2 cursor-pointer justify-between hover:bg-neutral-100"
                                        onClick={() => handleSelectAsset(item, input.index)}
                                      >
                                        <div className="flex gap-[8px] items-center">
                                          <img
                                            src={getTokenImageUrl(item)}
                                            alt={item.token?.lsp4TokenName || "NFT"}
                                            className="h-[24px] w-[24px] rounded-full"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.src = defaultTokenIcon.src;
                                            }}
                                          />
                                          <span className="text-neutral-700 overflow-hidden text-ellipsis whitespace-nowrap">
                                            {formatTokenName(item.token.lsp4TokenSymbol || formatAddressLong(item.token.formattedTokenId) || "Unknown NFT")}
                                          </span>
                                        </div>
                                        <span className="text-primary-500 font-satoshi-medium overflow-hidden text-ellipsis whitespace-nowrap">
                                          {formatBurntpix(item.token.formattedTokenId) || "UPN"}
                                        </span>
                                      </div>
                                    ))}
                                </>
                              )}
                              
                              {/* No results state */}
                              {getFilteredAssets(input.index).length === 0 && (
                                <div className="flex gap-[8px] p-2 min-h-[75px] items-center">
                                  <span className="text-neutral-700 overflow-hidden text-ellipsis whitespace-nowrap">
                                    No results for "{assetSearchTerms[input.index]}"
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add asset button */}
                <div
                  onClick={addAssetInput}
                  className="flex h-[40px] w-full rounded-50 px-[12px] py-[16px] gap-[8px] justify-center cursor-pointer items-center shadow-bottom-100 border border-solid bg-neutral-50 border-neutral-200"
                >
                  <span className="font-semibold text-neutral-500 text-[16px]">
                    Add asset
                  </span>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="text-neutral-500"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
              </div>
              
              {/* Send Button */}
              <button
                className={`w-full py-3 px-4 border border-transparent rounded-50 shadow-sm text-lg font-satoshi-medium text-white ${
                  Object.keys(transactionData.assets).length === 0 || !recipient
                    ? 'bg-neutral-300 cursor-not-allowed'
                    : 'bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                }`}
                disabled={Object.keys(transactionData.assets).length === 0 || !recipient}
                onClick={() => {handleTransfer()}}
              >
                Transfer
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}