/**
 * LuksoProfile Component - Renders a profile card for a LUKSO Universal Profile
 * 
 * This component fetches and displays profile information from a LUKSO Universal Profile,
 * including the profile image, background image, and full name. It uses the ERC725js library
 * to fetch profile metadata from the blockchain.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.address - The LUKSO Universal Profile address to fetch data from
 * 
 * @remarks
 * - Uses the LUKSO testnet RPC endpoint
 * - Falls back to a default avatar if no profile image is found
 * - Handles loading states and error cases gracefully
 */

import { useEffect, useState } from 'react';
import { ERC725 } from '@erc725/erc725.js';
import erc725schema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';
import { useUpProvider } from './upProvider';

// Constants for the IPFS gateway and RPC endpoint for the LUKSO testnet
const IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs/';
const RPC_ENDPOINT_TESTNET = 'https://rpc.testnet.lukso.network';
const RPC_ENDPOINT_MAINNET = 'https://rpc.mainnet.lukso.network';

interface LuksoProfileProps {
    address: string;
}

export function LuksoProfile({ address }: LuksoProfileProps) {
    const { setIsSearching, chainId } = useUpProvider();
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

    useEffect(() => {
        async function fetchProfileImage() {
            if (!address) return;

            setProfileData(prev => ({ ...prev, isLoading: true }));

            try {
                const config = { ipfsGateway: IPFS_GATEWAY };
                const rpcEndpoint = RPC_ENDPOINT_MAINNET;
                console.log(rpcEndpoint);
                const profile = new ERC725(erc725schema, address, rpcEndpoint, config);
                const fetchedData = await profile.fetchData('LSP3Profile');

                console.log(fetchedData);

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
                        profileAddress: address,
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
    }, [address, chainId]);

    return (
        <div className="flex flex-col items-center">
            {/* Profile Image */}
            <div className="relative h-24 w-24 mb-4">
                <img
                    src={profileData.imgUrl}
                    alt="Profile"
                    className="rounded-full w-full h-full object-cover border-4 border-white shadow-lg"
                />
            </div>

            {/* Username/Address */}
            {!profileData.isLoading && (
                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900">
                        {profileData.fullName || 'Anonymous User'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {`${profileData.profileAddress.substring(0, 6)}...${profileData.profileAddress.substring(profileData.profileAddress.length - 4)}`}
                    </p>
                </div>
            )}
        </div>
    );
} 