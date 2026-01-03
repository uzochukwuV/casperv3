import { useState, useEffect } from 'react';
import styled, { useTheme, keyframes, css } from 'styled-components';
import {
	FlexColumn,
	FlexRow,
	HeaderText,
	BodyText,
	Button,
	Text,
} from '@make-software/cspr-design';
import { getAvailableTokens, TokenInfo, prepareMintTransaction } from '../../services/requests/token-requests';
import useCsprClick from '../../services/hooks/use-cspr-click';
import { PublicKey } from 'casper-js-sdk';
import { useClickRef } from '@make-software/csprclick-ui';
import { TransactionStatus } from '@make-software/csprclick-core-types';

const fadeIn = keyframes`
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
`;

const Container = styled(FlexColumn)(({ theme }) =>
	theme.withMedia({
		width: '100%',
		padding: ['24px 0', '32px 0', '48px 0', '48px 0'],
	})
);

const SectionTitle = styled(HeaderText)(({ theme }) =>
	theme.withMedia({
		marginBottom: [24, 32, 40, 40],
		textAlign: 'center',
	})
);

const CardsGrid = styled.div(({ theme }) =>
	theme.withMedia({
		display: 'grid',
		gridTemplateColumns: ['1fr', '1fr', 'repeat(3, 1fr)', 'repeat(3, 1fr)'],
		gap: ['16px', '24px', '32px', '32px'],
		width: '100%',
	})
);

interface CardProps {
	isSelected: boolean;
	delay: number;
}

const TokenCard = styled(FlexColumn)<CardProps>`
	${({ theme, isSelected, delay }) => css`
		background: ${isSelected
			? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
			: theme.styleguideColors.backgroundSecondary};
		border-radius: 20px;
		padding: 32px 24px;
		border: ${isSelected
			? '2px solid #667eea'
			: `1px solid ${theme.styleguideColors.borderPrimary}`};
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		overflow: hidden;
		animation: ${fadeIn} 0.6s ease-out ${delay}s both;

		&:hover {
			transform: translateY(-8px);
			box-shadow: ${isSelected
				? '0 20px 40px rgba(102, 126, 234, 0.3)'
				: `0 20px 40px ${theme.styleguideColors.backgroundSecondary}`};
			border-color: ${isSelected ? '#667eea' : theme.styleguideColors.borderSecondary};
		}

		&::before {
			content: "";
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 4px;
			background: ${isSelected
				? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
				: 'transparent'};
			transition: all 0.3s ease;
		}
	`}
`;

const TokenIcon = styled(FlexColumn)(({ theme }) => ({
	width: '64px',
	height: '64px',
	borderRadius: '50%',
	background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	alignItems: 'center',
	justifyContent: 'center',
	marginBottom: '16px',
	boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)',
}));

const TokenSymbol = styled(Text)({
	fontSize: '24px',
	fontWeight: 900,
	color: '#FFFFFF',
});

const TokenName = styled(HeaderText)(({ theme }) => ({
	marginBottom: '8px',
	color: theme.styleguideColors.contentPrimary,
}));

const TokenDetail = styled(FlexRow)(({ theme }) => ({
	marginTop: '12px',
	padding: '8px 12px',
	background: theme.styleguideColors.backgroundTertiary,
	borderRadius: '8px',
	justifyContent: 'space-between',
}));

const DetailLabel = styled(BodyText).attrs({
	size: 4,
})(({ theme }) => ({
	color: theme.styleguideColors.contentSecondary,
	fontSize: '12px',
}));

const DetailValue = styled(BodyText).attrs({
	size: 4,
})(({ theme }) => ({
	color: theme.styleguideColors.contentPrimary,
	fontSize: '12px',
	fontWeight: 600,
}));

const MintForm = styled(FlexColumn)`
	${({ theme }) => css`
		margin-top: 48px;
		padding: 32px;
		background: ${theme.styleguideColors.backgroundSecondary};
		border-radius: 20px;
		border: 1px solid ${theme.styleguideColors.borderPrimary};
		max-width: 600px;
		margin: 48px auto 0;
		animation: ${fadeIn} 0.6s ease-out 0.3s both;
	`}
`;

const FormTitle = styled(HeaderText)(({ theme }) => ({
	marginBottom: '24px',
	textAlign: 'center',
}));

const InputGroup = styled(FlexColumn)({
	marginBottom: '24px',
});

const Label = styled(BodyText)(({ theme }) => ({
	marginBottom: '8px',
	color: theme.styleguideColors.contentPrimary,
	fontSize: '14px',
	fontWeight: 600,
}));

const Input = styled.input(({ theme }) => ({
	width: '100%',
	padding: '16px',
	borderRadius: '12px',
	border: `1px solid ${theme.styleguideColors.borderPrimary}`,
	background: theme.styleguideColors.backgroundTertiary,
	color: theme.styleguideColors.contentPrimary,
	fontSize: '16px',
	fontFamily: 'inherit',
	transition: 'all 0.3s ease',
	outline: 'none',
	'&:focus': {
		borderColor: '#667eea',
		boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
	},
	'&::placeholder': {
		color: theme.styleguideColors.contentSecondary,
	},
}));

const InfoBox = styled(FlexColumn)(({ theme }) => ({
	padding: '16px',
	background: 'rgba(102, 126, 234, 0.05)',
	borderRadius: '12px',
	border: '1px solid rgba(102, 126, 234, 0.2)',
	marginBottom: '24px',
}));

const InfoText = styled(BodyText)(({ theme }) => ({
	color: theme.styleguideColors.contentSecondary,
	fontSize: '13px',
	lineHeight: '1.6',
}));

const ActionButton = styled(Button)(({ theme }) => ({
	width: '100%',
	height: '48px',
	fontSize: '16px',
	fontWeight: 600,
}));

const formatSupply = (supply: string, decimals: number): string => {
	const value = BigInt(supply) / BigInt(10 ** decimals);
	return value.toLocaleString();
};

interface TokenMintCardsProps {
	selectedToken: string | null;
	setSelectedToken: (token: string | null) => void;
}

const TokenMintCards = ({
	selectedToken,
	setSelectedToken,
}: TokenMintCardsProps) => {
	const theme = useTheme();
	const tokens = getAvailableTokens();
	const { activeAccount } = useCsprClick();
	const clickRef = useClickRef();
	const [amount, setAmount] = useState<string>('');
	const [recipient, setRecipient] = useState<string>('');
	const [isMinting, setIsMinting] = useState<boolean>(false);
	const [mintSuccess, setMintSuccess] = useState<boolean>(false);
	const [mintError, setMintError] = useState<string | null>(null);

	const selectedTokenInfo = tokens.find(
		(t) => t.contractHash === selectedToken
	);

	// Set recipient to connected account hash when wallet connects
	useEffect(() => {
		console.log('Active Account Changed:', activeAccount);
		if (activeAccount?.public_key) {
			// Convert public key to account hash
			const accountHash = PublicKey.fromHex(activeAccount.public_key)
				.accountHash()
				.toHex();
			setRecipient(accountHash);
		}
	}, [activeAccount]);

	// Set default amount (2000 tokens) when a token is selected
	useEffect(() => {
		if (selectedTokenInfo && !amount) {
			const defaultAmount = 2000;
			setAmount((defaultAmount * 10 ** selectedTokenInfo.decimals).toString());
		}
	}, [selectedTokenInfo]);

	const handleTransactionStatusUpdate = async (status: string, data: any) => {
		if (status === TransactionStatus.SENT) {
			setIsMinting(true);
			setMintError(null);
		} else if (status === TransactionStatus.CANCELLED) {
			setIsMinting(false);
			setMintError('Transaction cancelled by user');
		} else if (
			status === TransactionStatus.TIMEOUT ||
			status === TransactionStatus.ERROR
		) {
			setIsMinting(false);
			setMintError('Transaction failed');
		} else if (status === TransactionStatus.PROCESSED) {
			const transaction = data.csprCloudTransaction;
			if (!transaction.error_message) {
				setIsMinting(false);
				setMintSuccess(true);
				setMintError(null);
				// Reset form after 3 seconds
				setTimeout(() => {
					setMintSuccess(false);
					setAmount('');
				}, 3000);
			} else {
				setIsMinting(false);
				setMintError(`Transaction failed: ${transaction.error_message}`);
			}
		}
	};

	const handleMint = async () => {
		if (!activeAccount?.public_key || !selectedToken || !amount || !recipient) {
			setMintError('Please fill in all fields and connect wallet');
			return;
		}

		try {
			const playerPublicKey = PublicKey.fromHex(activeAccount.public_key);

			// Prepare the mint transaction
			const transaction = await prepareMintTransaction(
				playerPublicKey,
				selectedToken,
				recipient,
				amount
			);

			// Send transaction via CSPR Click wallet
			await window.csprclick.send(
				{ Version1: transaction.toJSON() },
				playerPublicKey.toHex(),
				handleTransactionStatusUpdate
			);
		} catch (e) {
			console.error('Minting error:', e);
			setIsMinting(false);
			setMintError('Failed to prepare transaction. Please try again.');
		}
	};

	const setMaxAmount = () => {
		if (selectedTokenInfo) {
			const maxAmount = 1000000; // 1M tokens
			setAmount((maxAmount * 10 ** selectedTokenInfo.decimals).toString());
		}
	};

	return (
		<Container>
			<SectionTitle size={2}>Select a Token to Mint</SectionTitle>
			<CardsGrid>
				{tokens.map((token: TokenInfo, index: number) => (
					<TokenCard
						key={token.contractHash}
						isSelected={selectedToken === token.contractHash}
						delay={index * 0.1}
						onClick={() => setSelectedToken(token.contractHash)}
					>
						<TokenIcon>
							<TokenSymbol>{token.symbol}</TokenSymbol>
						</TokenIcon>
						<TokenName size={4}>{token.name}</TokenName>
						<BodyText
							size={4}
							variation={'darkGray'}
							style={{ marginBottom: '16px' }}
						>
							{token.symbol}
						</BodyText>
						<TokenDetail>
							<DetailLabel>Decimals</DetailLabel>
							<DetailValue>{token.decimals}</DetailValue>
						</TokenDetail>
						<TokenDetail>
							<DetailLabel>Total Supply</DetailLabel>
							<DetailValue>
								{formatSupply(token.totalSupply, token.decimals)}
							</DetailValue>
						</TokenDetail>
					</TokenCard>
				))}
			</CardsGrid>

			{selectedToken && selectedTokenInfo && (
				<MintForm>
					<FormTitle size={3}>
						Mint {selectedTokenInfo.symbol}
					</FormTitle>

					<InfoBox>
						<InfoText size={4}>
							💡 You&lsquo;re minting test tokens on Casper Testnet. These
							tokens have no real value and are only for testing
							CasperSwap V3 features.
						</InfoText>
					</InfoBox>

					<InputGroup>
						<Label size={4}>Recipient Address</Label>
						<Input
							type="text"
							placeholder="account-hash or contract-package hash"
							value={recipient}

							onChange={(e) => setRecipient(e.target.value)}
						/>
					</InputGroup>

					<InputGroup>
						<FlexRow
							style={{
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '8px',
							}}
						>
							<Label size={4} style={{ marginBottom: 0 }}>Amount</Label>
							<Button
								
								color="primaryBlue"
								onClick={setMaxAmount}
								style={{
									padding: '4px 12px',
									height: 'auto',
									fontSize: '12px',
								}}
							>
								MAX
							</Button>
						</FlexRow>
						<Input
							type="text"
							placeholder={`Amount in smallest unit (10^${selectedTokenInfo.decimals})`}
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
						{amount && (
							<BodyText
								size={4}
								variation={'darkGray'}
								style={{ marginTop: '8px' }}
							>
								≈{' '}
								{(
									Number(amount) /
									10 ** selectedTokenInfo.decimals
								).toLocaleString()}{' '}
								{selectedTokenInfo.symbol}
							</BodyText>
						)}
					</InputGroup>

					{mintError && (
						<InfoBox style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
							<InfoText size={4} style={{ color: '#ef4444' }}>
								❌ {mintError}
							</InfoText>
						</InfoBox>
					)}

					{mintSuccess && (
						<InfoBox style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
							<InfoText size={4} style={{ color: '#22c55e' }}>
								✅ Tokens minted successfully!
							</InfoText>
						</InfoBox>
					)}

					<ActionButton
						color={'primaryBlue'}
						onClick={handleMint}
						disabled={!amount || !recipient || isMinting || !activeAccount}
					>
						{isMinting ? 'Minting...' : mintSuccess ? 'Minted!' : 'Mint Tokens'}
					</ActionButton>
				</MintForm>
			)}
		</Container>
	);
};

export default TokenMintCards;
