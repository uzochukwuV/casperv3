import styled from 'styled-components';
import { PageLayout } from '../../components';
import MintHero from './MintHero';
import TokenMintCards from './TokenMintCards';
import { useState } from 'react';

const StyledPageLayout = styled(PageLayout)(() => ({
	marginTop: 60,
}));

const MintScene = () => {
	const [selectedToken, setSelectedToken] = useState<string | null>(null);

	return (
		<>
			<MintHero />
			<StyledPageLayout title={'Token Minting - CasperSwap V3'}>
				<TokenMintCards
					selectedToken={selectedToken}
					setSelectedToken={setSelectedToken}
				/>
			</StyledPageLayout>
		</>
	);
};

export default MintScene;
