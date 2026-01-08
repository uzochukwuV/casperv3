import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
	FlexColumn,
	FlexRow,
	HeaderText,
	BodyText,
	Button,
} from '@make-software/cspr-design';
import { PublicKey } from 'casper-js-sdk';
import { TransactionStatus } from '@make-software/csprclick-core-types';
import useCsprClick from '../../services/hooks/use-cspr-click';
import {
	prepareCreatePoolTransaction,
	prepareInitializePoolTransaction,
	FEE_TIERS,
	getAvailableTokensForPool,
	priceToSqrtPriceX96,
} from '../../services/requests/dex-requests';

const ModalOverlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justifyContent: center;
	z-index: 1000;
	backdrop-filter: blur(4px);
`;

const ModalContent = styled(FlexColumn)(({ theme }) => ({
	background: theme.styleguideColors.backgroundPrimary,
	borderRadius: '20px',
	padding: '32px',
	maxWidth: '600px',
	width: '90%',
	maxHeight: '90vh',
	overflowY: 'auto',
	boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
}));

const ModalHeader = styled(FlexRow)({
	justifyContent: 'space-between',
	alignItems: 'center',
	marginBottom: '24px',
});

const CloseButton = styled.button(({ theme }) => ({
	background: 'transparent',
	border: 'none',
	fontSize: '24px',
	cursor: 'pointer',
	color: theme.styleguideColors.contentSecondary,
	padding: '4px 8px',
	'&:hover': {
		color: theme.styleguideColors.contentPrimary,
	},
}));

const FormSection = styled(FlexColumn)({
	marginBottom: '24px',
});

const Label = styled(BodyText)(({ theme }) => ({
	marginBottom: '8px',
	fontWeight: 600,
	color: theme.styleguideColors.contentPrimary,
}));

const Select = styled.select(({ theme }) => ({
	width: '100%',
	padding: '16px',
	borderRadius: '12px',
	border: `1px solid ${theme.styleguideColors.borderPrimary}`,
	background: theme.styleguideColors.backgroundSecondary,
	color: theme.styleguideColors.contentPrimary,
	fontSize: '16px',
	fontFamily: 'inherit',
	cursor: 'pointer',
	'&:focus': {
		outline: 'none',
		borderColor: '#FF0011',
	},
}));

const Input = styled.input(({ theme }) => ({
	width: '100%',
	padding: '16px',
	borderRadius: '12px',
	border: `1px solid ${theme.styleguideColors.borderPrimary}`,
	background: theme.styleguideColors.backgroundSecondary,
	color: theme.styleguideColors.contentPrimary,
	fontSize: '16px',
	fontFamily: 'inherit',
	'&:focus': {
		outline: 'none',
		borderColor: '#FF0011',
	},
	'&::placeholder': {
		color: theme.styleguideColors.contentSecondary,
	},
}));

const FeeOption = styled.div<{ selected: boolean }>(({ theme, selected }) => ({
	padding: '16px',
	borderRadius: '12px',
	border: `2px solid ${selected ? '#FF0011' : theme.styleguideColors.borderPrimary}`,
	background: selected
		? 'rgba(255, 0, 17, 0.05)'
		: theme.styleguideColors.backgroundSecondary,
	cursor: 'pointer',
	transition: 'all 0.2s ease',
	'&:hover': {
		borderColor: '#FF0011',
	},
}));

const FeeGrid = styled.div({
	display: 'grid',
	gridTemplateColumns: 'repeat(3, 1fr)',
	gap: '12px',
});

const InfoBox = styled(FlexColumn)(({ theme }) => ({
	padding: '16px',
	background: 'rgba(255, 0, 17, 0.05)',
	borderRadius: '12px',
	border: '1px solid rgba(255, 0, 17, 0.2)',
	marginBottom: '24px',
}));

const InfoText = styled(BodyText)(({ theme }) => ({
	color: theme.styleguideColors.contentSecondary,
	fontSize: '13px',
	lineHeight: '1.6',
}));

const StatusBox = styled(FlexColumn)<{ type: 'error' | 'success' | 'warning' }>(
	({ theme, type }) => ({
		padding: '16px',
		background:
			type === 'error'
				? 'rgba(239, 68, 68, 0.1)'
				: type === 'success'
				? 'rgba(34, 197, 94, 0.1)'
				: 'rgba(251, 191, 36, 0.1)',
		borderRadius: '12px',
		border: `1px solid ${
			type === 'error'
				? 'rgba(239, 68, 68, 0.3)'
				: type === 'success'
				? 'rgba(34, 197, 94, 0.3)'
				: 'rgba(251, 191, 36, 0.3)'
		}`,
		marginBottom: '16px',
	})
);

const StatusText = styled(BodyText)<{ type: 'error' | 'success' | 'warning' }>(
	({ type }) => ({
		color:
			type === 'error'
				? '#ef4444'
				: type === 'success'
				? '#22c55e'
				: '#f59e0b',
		fontSize: '14px',
	})
);

const ActionButton = styled(Button)(({ theme }) => ({
	width: '100%',
	height: '48px',
	fontSize: '16px',
	zIndex: 100,
	fontWeight: 600,
	marginTop: '8px',
}));

const StepIndicator = styled(FlexRow)({
	marginBottom: '24px',
	gap: '8px',
});

const Step = styled.div<{ active: boolean; completed: boolean }>(
	({ theme, active, completed }) => ({
		flex: 1,
		height: '4px',
		borderRadius: '2px',
		background: completed
			? '#FF0011'
			: active
			? 'rgba(255, 0, 17, 0.3)'
			: theme.styleguideColors.borderPrimary,
		transition: 'all 0.3s ease',
	})
);

interface CreatePoolModalProps {
	onClose: () => void;
	activeAccount: any;
}

enum ModalStep {
	CREATE_POOL = 1,
	INITIALIZE_POOL = 2,
	COMPLETE = 3,
}

const CreatePoolModal = ({ onClose, activeAccount }: CreatePoolModalProps) => {
	
	console.log("Active account in CreatePoolModal:", activeAccount);
	const tokens = getAvailableTokensForPool();

	// Step 1: Create Pool
	const [currentStep, setCurrentStep] = useState<ModalStep>(ModalStep.CREATE_POOL);
	const [tokenA, setTokenA] = useState<string>('');
	const [tokenB, setTokenB] = useState<string>('');
	const [selectedFee, setSelectedFee] = useState<number>(3000);
	const [isCreating, setIsCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [createSuccess, setCreateSuccess] = useState(false);

	// Step 2: Initialize Pool
	const [initialPrice, setInitialPrice] = useState<string>('1');
	const [isInitializing, setIsInitializing] = useState(false);
	const [initializeError, setInitializeError] = useState<string | null>(null);
	const [initializeSuccess, setInitializeSuccess] = useState(false);

	const handleCreatePool = async () => {
		console.log("create pool clicked");
		if (!activeAccount?.public_key || !tokenA || !tokenB) {
			console.log(activeAccount, tokenA, tokenB);	
			setCreateError('Please connect wallet and select both tokens');
			return;
		}

		if (tokenA === tokenB) {
			setCreateError('Please select different tokens');
			return;
		}

		try {
			setIsCreating(true);
			setCreateError(null);

			const playerPublicKey = PublicKey.fromHex(activeAccount.public_key);

			const transaction = await prepareCreatePoolTransaction(
				playerPublicKey,
				tokenA,
				tokenB,
				selectedFee
			);

			await window.csprclick.send(
				{ Version1: transaction.toJSON() },
				playerPublicKey.toHex(),
				async (status: string, data: any) => {
					if (status === TransactionStatus.PROCESSED) {
						const tx = data.csprCloudTransaction;
						if (!tx.error_message) {
							setIsCreating(false);
							setCreateSuccess(true);
							setCreateError(null);
							// Move to step 2 after 2 seconds
							setTimeout(() => {
								setCurrentStep(ModalStep.INITIALIZE_POOL);
								setCreateSuccess(false);
							}, 2000);
						} else {
							setIsCreating(false);
							setCreateError(`Transaction failed: ${tx.error_message}`);
						}
					} else if (status === TransactionStatus.CANCELLED) {
						setIsCreating(false);
						setCreateError('Transaction cancelled by user');
					} else if (
						status === TransactionStatus.TIMEOUT ||
						status === TransactionStatus.ERROR
					) {
						setIsCreating(false);
						setCreateError('Transaction failed');
					}
				}
			);
		} catch (e) {
			console.error('Create pool error:', e);
			setIsCreating(false);
			setCreateError('Failed to create pool. Please try again.');
		}
	};

	const handleInitializePool = async () => {
		if (!activeAccount?.public_key || !tokenA || !tokenB || !initialPrice) {
			setInitializeError('Please fill in all fields');
			return;
		}

		const price = parseFloat(initialPrice);
		if (isNaN(price) || price <= 0) {
			setInitializeError('Please enter a valid price');
			return;
		}

		try {
			setIsInitializing(true);
			setInitializeError(null);

			const playerPublicKey = PublicKey.fromHex(activeAccount.public_key);

			// Convert price to sqrtPriceX96
			const sqrtPriceX96 = priceToSqrtPriceX96(price);

			// Order tokens (same as contract does)
			const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];

			const transaction = await prepareInitializePoolTransaction(
				playerPublicKey,
				token0,
				token1,
				selectedFee,
				sqrtPriceX96
			);

			await window.csprclick.send(
				{ Version1: transaction.toJSON() },
				playerPublicKey.toHex(),
				async (status: string, data: any) => {
					if (status === TransactionStatus.PROCESSED) {
						const tx = data.csprCloudTransaction;
						if (!tx.error_message) {
							setIsInitializing(false);
							setInitializeSuccess(true);
							setInitializeError(null);
							// Move to complete step
							setTimeout(() => {
								setCurrentStep(ModalStep.COMPLETE);
							}, 2000);
						} else {
							setIsInitializing(false);
							setInitializeError(`Transaction failed: ${tx.error_message}`);
						}
					} else if (status === TransactionStatus.CANCELLED) {
						setIsInitializing(false);
						setInitializeError('Transaction cancelled by user');
					} else if (
						status === TransactionStatus.TIMEOUT ||
						status === TransactionStatus.ERROR
					) {
						setIsInitializing(false);
						setInitializeError('Transaction failed');
					}
				}
			);
		} catch (e) {
			console.error('Initialize pool error:', e);
			setIsInitializing(false);
			setInitializeError('Failed to initialize pool. Please try again.');
		}
	};

	const getTokenSymbol = (contractHash: string) => {
		return tokens.find((t) => t.contractHash === contractHash)?.symbol || '';
	};

	return (
		<ModalOverlay onClick={onClose}>
			<ModalContent onClick={(e) => e.stopPropagation()}>
				<ModalHeader>
					<HeaderText size={3}>
						{currentStep === ModalStep.CREATE_POOL
							? 'Create Pool'
							: currentStep === ModalStep.INITIALIZE_POOL
							? 'Initialize Pool'
							: 'Pool Created!'}
					</HeaderText>
					<CloseButton onClick={onClose}>×</CloseButton>
				</ModalHeader>

				<StepIndicator>
					<Step active={currentStep === ModalStep.CREATE_POOL} completed={currentStep > ModalStep.CREATE_POOL} />
					<Step active={currentStep === ModalStep.INITIALIZE_POOL} completed={currentStep > ModalStep.INITIALIZE_POOL} />
					<Step active={currentStep === ModalStep.COMPLETE} completed={false} />
				</StepIndicator>

				{currentStep === ModalStep.CREATE_POOL && (
					<>
						<InfoBox>
							<InfoText size={4}>
								💡 Create a new concentrated liquidity pool. Select two tokens
								and a fee tier, then initialize with a starting price.
							</InfoText>
						</InfoBox>

						<FormSection>
							<Label size={4}>Token A</Label>
							<Select
								value={tokenA}
								onChange={(e) => setTokenA(e.target.value)}
							>
								<option value="">Select token</option>
								{tokens.map((token) => (
									<option key={token.contractHash} value={token.contractHash}>
										{token.symbol} - {token.name}
									</option>
								))}
							</Select>
						</FormSection>

						<FormSection>
							<Label size={4}>Token B</Label>
							<Select
								value={tokenB}
								onChange={(e) => setTokenB(e.target.value)}
							>
								<option value="">Select token</option>
								{tokens
									.filter((t) => t.contractHash !== tokenA)
									.map((token) => (
										<option key={token.contractHash} value={token.contractHash}>
											{token.symbol} - {token.name}
										</option>
									))}
							</Select>
						</FormSection>

						<FormSection>
							<Label size={4}>Fee Tier</Label>
							<FeeGrid>
								{FEE_TIERS.map((tier) => (
									<FeeOption
										key={tier.value}
										selected={selectedFee === tier.value}
										onClick={() => setSelectedFee(tier.value)}
									>
										<div style={{ fontWeight: 600, marginBottom: '4px' }}>
											{tier.label}
										</div>
										<div style={{ fontSize: '12px', opacity: 0.7 }}>
											{tier.description}
										</div>
									</FeeOption>
								))}
							</FeeGrid>
						</FormSection>

						{createError && (
							<StatusBox type="error">
								<StatusText size={4} type="error">❌ {createError}</StatusText>
							</StatusBox>
						)}

						{createSuccess && (
							<StatusBox type="success">
								<StatusText size={4} type="success">
									✅ Pool created successfully!
								</StatusText>
							</StatusBox>
						)}

						<ActionButton
							color="primaryBlue"
							onClick={handleCreatePool}
							disabled={
								!tokenA ||
								!tokenB ||
								!selectedFee ||
								isCreating ||
								tokenA === tokenB
							}
						>
							{isCreating ? 'Creating Pool...' : 'Create Pool'}
						</ActionButton>
					</>
				)}

				{currentStep === ModalStep.INITIALIZE_POOL && (
					<>
						<InfoBox>
							<InfoText size={4}>
								💡 Set the initial price for{' '}
								<strong>
									{getTokenSymbol(tokenA)}/{getTokenSymbol(tokenB)}
								</strong>
								. This determines the starting sqrtPriceX96 value.
							</InfoText>
						</InfoBox>

						<FormSection>
							<Label size={4}>
								Initial Price ({getTokenSymbol(tokenB)} per{' '}
								{getTokenSymbol(tokenA)})
							</Label>
							<Input
								type="number"
								placeholder="1.0"
								value={initialPrice}
								onChange={(e) => setInitialPrice(e.target.value)}
								step="0.000001"
								min="0"
							/>
							<BodyText
								size={4}
								style={{ marginTop: '8px', opacity: 0.7, fontSize: '12px' }}
							>
								Example: If 1 {getTokenSymbol(tokenA)} = 1000{' '}
								{getTokenSymbol(tokenB)}, enter 1000
							</BodyText>
						</FormSection>

						{initializeError && (
							<StatusBox type="error">
								<StatusText size={4} type="error">❌ {initializeError}</StatusText>
							</StatusBox>
						)}

						{initializeSuccess && (
							<StatusBox type="success">
								<StatusText size={4} type="success">
									✅ Pool initialized successfully!
								</StatusText>
							</StatusBox>
						)}

						<ActionButton
							color="primaryBlue"
							onClick={handleInitializePool}
							disabled={!initialPrice || isInitializing || !activeAccount}
						>
							{isInitializing ? 'Initializing...' : 'Initialize Pool'}
						</ActionButton>
					</>
				)}

				{currentStep === ModalStep.COMPLETE && (
					<>
						<StatusBox type="success">
							<HeaderText size={4} style={{ color: '#22c55e', marginBottom: '8px' }}>
								🎉 Pool Created Successfully!
							</HeaderText>
							<InfoText size={4} style={{ color: '#16a34a' }}>
								Your {getTokenSymbol(tokenA)}/{getTokenSymbol(tokenB)} pool with {FEE_TIERS.find(t => t.value === selectedFee)?.label} fee is now active and ready for liquidity!
							</InfoText>
						</StatusBox>

						<ActionButton
							color="primaryBlue"
							onClick={onClose}
						>
							Done
						</ActionButton>
					</>
				)}
			</ModalContent>
		</ModalOverlay>
	);
};

export default CreatePoolModal;
