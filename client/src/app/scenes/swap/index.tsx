import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { FlexColumn, FlexRow } from '@make-software/cspr-design';
import { PageLayout } from '../../components';
import { PublicKey } from 'casper-js-sdk';
import { TransactionStatus } from '@make-software/csprclick-core-types';
import useCsprClick from '../../services/hooks/use-cspr-click';
import {
	prepareSwapTransaction,
	prepareApproveTransaction,
	getAvailableTokensForPool,
	FEE_TIERS,
	priceToSqrtPriceX96,
	sqrtPriceX96ToPrice,
} from '../../services/requests/dex-requests';

// --- Icons (Inline SVGs for portability) ---
const SettingsIcon = () => (
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);

const ArrowDownIcon = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
);

const ChevronDown = () => (
	<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);

// --- Styled Components ---

const SwapContainer = styled(FlexColumn)`
	min-width: 480px;
	margin: 60px auto;
	padding: 0 8px;
	position: relative;
`;

const SwapCard = styled(FlexColumn)`
	background-color: ${({ theme }) => theme.dexColors.white};
	border-radius: 24px;
	padding: 8px;
	box-shadow: 0px 40px 120px -20px rgba(0, 0, 0, 0.15);
	border: 1px solid ${({ theme }) => theme.dexColors.ashLight};
	position: relative;
	z-index: 1;
`;

const SwapHeader = styled(FlexRow)`
	justify-content: space-between;
	align-items: center;
	padding: 12px 20px;
	margin-bottom: 0;
`;

const SwapTitle = styled.h2`
	font-size: 16px;
	font-weight: 600;
	color: ${({ theme }) => theme.dexColors.chocolateDark};
	margin: 0;
`;

const IconButton = styled.button`
	background: transparent;
	border: none;
	cursor: pointer;
	color: ${({ theme }) => theme.dexColors.chocolate};
	opacity: 0.6;
	transition: 0.2s;
	&:hover { opacity: 1; transform: rotate(45deg); }
`;

const InputPanel = styled(FlexColumn)`
	background-color: ${({ theme }) => theme.dexColors.gray};
	border-radius: 20px;
	padding: 16px;
	border: 1px solid transparent;
	transition: 0.2s;

	&:hover {
		border-color: ${({ theme }) => theme.dexColors.ashLight};
	}
`;

const InputRow = styled(FlexRow)`
	justify-content: space-between;
	align-items: center;
	margin-bottom: ${({ $marginBottom }) => $marginBottom || '0'};
`;

const InputLabel = styled.span`
	font-size: 14px;
	font-weight: 500;
	color: ${({ theme }) => theme.dexColors.chocolate};
	opacity: 0.6;
`;

const AmountInput = styled.input`
	background: transparent;
	border: none;
	font-size: 36px;
	font-weight: 500;
	color: ${({ theme }) => theme.dexColors.chocolateDark};
	width: 0;
	flex: 1;
	outline: none;
	padding: 0;

	&::placeholder {
		color: ${({ theme }) => theme.dexColors.ash};
	}
`;

const TokenSelector = styled.button`
	background-color: ${({ theme }) => theme.dexColors.white};
	border: 1px solid ${({ theme }) => theme.dexColors.ashLight};
	box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	border-radius: 18px;
	padding: 6px 8px 6px 12px;
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	font-weight: 600;
	font-size: 20px;
	color: ${({ theme }) => theme.dexColors.chocolateDark};
	transition: 0.2s;

	&:hover {
		background-color: ${({ theme }) => theme.dexColors.ashLight};
	}
`;

const TokenIconPlaceholder = styled.div`
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
`;

const USDValue = styled.div`
	font-size: 12px;
	color: ${({ theme }) => theme.dexColors.ash};
	margin-top: 4px;
`;

const SwitcherWrapper = styled.div`
	position: relative;
	height: 4px;
	z-index: 2;
`;

const SwitchButton = styled.button`
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 32px;
	height: 32px;
	border-radius: 12px;
	background-color: ${({ theme }) => theme.dexColors.gray};
	border: 4px solid ${({ theme }) => theme.dexColors.white};
	color: ${({ theme }) => theme.dexColors.chocolate};
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: 0.2s;

	&:hover {
		background-color: ${({ theme }) => theme.dexColors.ashLight};
	}
`;

const MainButton = styled.button<{ disabled?: boolean }>`
	background-color: ${({ theme, disabled }) => disabled ? theme.dexColors.ash : theme.dexColors.chocolate};
	color: ${({ theme }) => theme.dexColors.white};
	border: none;
	border-radius: 20px;
	padding: 18px;
	font-size: 20px;
	font-weight: 600;
	cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
	margin-top: 8px;
	width: 100%;
	box-shadow: ${({ disabled }) => disabled ? 'none' : '0 4px 12px rgba(255, 107, 107, 0.2)'};
	transition: 0.2s;
	opacity: ${({ disabled }) => disabled ? 0.5 : 1};

	&:hover {
		transform: ${({ disabled }) => disabled ? 'none' : 'translateY(-1px)'};
		filter: ${({ disabled }) => disabled ? 'none' : 'brightness(1.05)'};
	}

	&:active {
		transform: ${({ disabled }) => disabled ? 'none' : 'translateY(0)'};
	}
`;

const ModalOverlay = styled.div`
	position: absolute;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.5);
	border-radius: 24px;
	z-index: 10;
	display: flex;
	align-items: center;
	justify-content: center;
	backdrop-filter: blur(2px);
`;

const ModalContent = styled.div`
	width: 90%;
	background: white;
	border-radius: 16px;
	padding: 20px;
	box-shadow: 0 10px 40px rgba(0,0,0,0.2);
`;

const TokenListRow = styled.div`
	padding: 12px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	cursor: pointer;
	border-radius: 8px;
	transition: 0.2s;

	&:hover {
		background: #f0f0f0;
	}
`;

const TokenInfo = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
`;

const TokenSymbol = styled.span`
	font-weight: 600;
	font-size: 16px;
`;

const TokenName = styled.span`
	font-size: 12px;
	color: #666;
`;

const InfoBox = styled.div`
	padding: 12px 16px;
	background-color: rgba(255, 0, 17, 0.05);
	border-radius: 12px;
	margin: 8px 0;
	font-size: 13px;
	color: #666;
`;

const QuoteBox = styled.div`
	padding: 12px 16px;
	background-color: ${({ theme }) => theme.dexColors.gray};
	border-radius: 12px;
	margin: 8px 0;
	font-size: 13px;
`;

const QuoteRow = styled.div`
	display: flex;
	justify-content: space-between;
	margin: 4px 0;
	font-size: 13px;
	color: #666;
`;

const StatusBox = styled.div<{ type: 'error' | 'success' | 'warning' }>`
	padding: 12px 16px;
	background: ${({ type }) =>
		type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
		type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
		'rgba(251, 191, 36, 0.1)'};
	border: 1px solid ${({ type }) =>
		type === 'error' ? 'rgba(239, 68, 68, 0.3)' :
		type === 'success' ? 'rgba(34, 197, 94, 0.3)' :
		'rgba(251, 191, 36, 0.3)'};
	border-radius: 12px;
	margin: 8px 0;
	color: ${({ type }) =>
		type === 'error' ? '#ef4444' :
		type === 'success' ? '#22c55e' :
		'#f59e0b'};
	font-size: 14px;
`;

// --- Component ---

const SwapScene = () => {
	const { activeAccount } = useCsprClick();
	const tokens = getAvailableTokensForPool();

	const [fromAmount, setFromAmount] = useState('');
	const [toAmount, setToAmount] = useState('');
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeSide, setActiveSide] = useState<'from' | 'to' | null>(null);
	const [selectedFee, setSelectedFee] = useState(3000); // 0.3% default

	const [fromToken, setFromToken] = useState(tokens[0].contractHash);
	const [toToken, setToToken] = useState(tokens[1].contractHash);

	const [isSwapping, setIsSwapping] = useState(false);
	const [swapError, setSwapError] = useState<string | null>(null);
	const [swapSuccess, setSwapSuccess] = useState(false);

	// Mock balances (in production, fetch from chain)
	const [mockBalances] = useState({
		[tokens[0].contractHash]: '2400.00',
		[tokens[1].contractHash]: '0.00',
		[tokens[2].contractHash]: '1200.00',
	});

	// Mock price data (in production, fetch from pool)
	const mockPrice = 0.032; // Example: 1 TCSPR = 0.032 USDT

	useEffect(() => {
		// Calculate output amount when input changes
		if (fromAmount && !isNaN(Number(fromAmount))) {
			const inputAmount = Number(fromAmount);
			const feeMultiplier = 1 - (selectedFee / 1000000); // Apply fee
			const outputAmount = inputAmount * mockPrice * feeMultiplier;
			setToAmount(outputAmount.toFixed(6));
		} else {
			setToAmount('');
		}
	}, [fromAmount, selectedFee]);

	const handleOpenModal = (side: 'from' | 'to') => {
		setActiveSide(side);
		setIsModalOpen(true);
	};

	const handleSelectToken = (contractHash: string) => {
		if (activeSide === 'from') {
			if (contractHash === toToken) {
				// Swap if selecting the same as 'to'
				setToToken(fromToken);
			}
			setFromToken(contractHash);
		} else {
			if (contractHash === fromToken) {
				// Swap if selecting the same as 'from'
				setFromToken(toToken);
			}
			setToToken(contractHash);
		}
		setIsModalOpen(false);
	};

	const handleSwitch = () => {
		const tempToken = fromToken;
		setFromToken(toToken);
		setToToken(tempToken);

		const tempAmount = fromAmount;
		setFromAmount(toAmount);
		// Recalculate will happen via useEffect
	};

	const getTokenSymbol = (contractHash: string) => {
		return tokens.find(t => t.contractHash === contractHash)?.symbol || '';
	};

	const getTokenBalance = (contractHash: string) => {
		return mockBalances[contractHash] || '0.00';
	};

	const handleSwap = async () => {
		if (!activeAccount?.public_key) {
			setSwapError('Please connect your wallet');
			return;
		}

		if (!fromAmount || Number(fromAmount) <= 0) {
			setSwapError('Please enter a valid amount');
			return;
		}

		try {
			setIsSwapping(true);
			setSwapError(null);
			setSwapSuccess(false);

			const playerPublicKey = PublicKey.fromHex(activeAccount.public_key);

			// Order tokens (same as contract)
			const [token0, token1] = fromToken < toToken ? [fromToken, toToken] : [toToken, fromToken];
			const zeroForOne = fromToken < toToken;

			// Convert amount to smallest unit (assuming 9 decimals for TCSPR, 6 for USDT)
			const fromTokenData = tokens.find(t => t.contractHash === fromToken);
			const amountInSmallestUnit = Math.floor(Number(fromAmount) * Math.pow(10, fromTokenData?.decimals || 9));

			// Mock sqrt price limit (in production, calculate based on slippage tolerance)
			const sqrtPriceLimitX96 = zeroForOne
				? '4295128739' // Min price for zeroForOne
				: '1461446703485210103287273052203988822378723970341'; // Max price for oneForZero

			// Prepare and send swap transaction
			const transaction = await prepareSwapTransaction(
				playerPublicKey,
				token0,
				token1,
				selectedFee,
				activeAccount.public_key.replace('01', '').replace('02', ''), // Strip prefix
				zeroForOne,
				amountInSmallestUnit.toString(),
				sqrtPriceLimitX96
			);

			await window.csprclick.send(
				{ Version1: transaction.toJSON() },
				playerPublicKey.toHex(),
				async (status: string, data: any) => {
					if (status === TransactionStatus.PROCESSED) {
						const tx = data.csprCloudTransaction;
						if (!tx.error_message) {
							setIsSwapping(false);
							setSwapSuccess(true);
							setSwapError(null);

							// Reset form after 3 seconds
							setTimeout(() => {
								setFromAmount('');
								setToAmount('');
								setSwapSuccess(false);
							}, 3000);
						} else {
							setIsSwapping(false);
							setSwapError(`Transaction failed: ${tx.error_message}`);
						}
					} else if (status === TransactionStatus.CANCELLED) {
						setIsSwapping(false);
						setSwapError('Transaction cancelled by user');
					} else if (
						status === TransactionStatus.TIMEOUT ||
						status === TransactionStatus.ERROR
					) {
						setIsSwapping(false);
						setSwapError('Transaction failed');
					}
				}
			);
		} catch (e) {
			console.error('Swap error:', e);
			setIsSwapping(false);
			setSwapError('Failed to execute swap. Please try again.');
		}
	};

	const canSwap = activeAccount && fromAmount && Number(fromAmount) > 0 && fromToken !== toToken && !isSwapping;

	return (
		<PageLayout>
			<SwapContainer>
				<SwapCard>
					<SwapHeader>
						<SwapTitle>Swap</SwapTitle>
						<IconButton><SettingsIcon /></IconButton>
					</SwapHeader>

					{!activeAccount && (
						<InfoBox>
							💡 Please connect your wallet to start swapping
						</InfoBox>
					)}

					{/* FROM PANEL */}
					<InputPanel>
						<InputRow $marginBottom="8px">
							<InputLabel>Pay</InputLabel>
							<InputLabel>Balance: {getTokenBalance(fromToken)}</InputLabel>
						</InputRow>
						<InputRow>
							<AmountInput
								placeholder="0"
								value={fromAmount}
								onChange={(e) => setFromAmount(e.target.value)}
								type="number"
								step="any"
								min="0"
							/>
							<TokenSelector onClick={() => handleOpenModal('from')}>
								<TokenIconPlaceholder />
								{getTokenSymbol(fromToken)} <ChevronDown />
							</TokenSelector>
						</InputRow>
						<USDValue>~${(Number(fromAmount) * mockPrice).toFixed(2)}</USDValue>
					</InputPanel>

					{/* SWITCHER ARROW */}
					<SwitcherWrapper>
						<SwitchButton onClick={handleSwitch}>
							<ArrowDownIcon />
						</SwitchButton>
					</SwitcherWrapper>

					{/* TO PANEL */}
					<InputPanel>
						<InputRow $marginBottom="8px">
							<InputLabel>Receive</InputLabel>
							<InputLabel>Balance: {getTokenBalance(toToken)}</InputLabel>
						</InputRow>
						<InputRow>
							<AmountInput
								placeholder="0"
								value={toAmount}
								readOnly
							/>
							<TokenSelector onClick={() => handleOpenModal('to')}>
								<TokenIconPlaceholder style={{ background: 'linear-gradient(135deg, #26A17B 0%, #4FD1C5 100%)' }}/>
								{getTokenSymbol(toToken)} <ChevronDown />
							</TokenSelector>
						</InputRow>
						<USDValue>~${(Number(toAmount) * 1).toFixed(2)}</USDValue>
					</InputPanel>

					{/* Quote Information */}
					{fromAmount && toAmount && (
						<QuoteBox>
							<QuoteRow>
								<span>Rate:</span>
								<strong>1 {getTokenSymbol(fromToken)} = {mockPrice.toFixed(6)} {getTokenSymbol(toToken)}</strong>
							</QuoteRow>
							<QuoteRow>
								<span>Fee ({FEE_TIERS.find(t => t.value === selectedFee)?.label}):</span>
								<strong>{(Number(fromAmount) * mockPrice * (selectedFee / 1000000)).toFixed(6)} {getTokenSymbol(toToken)}</strong>
							</QuoteRow>
							<QuoteRow>
								<span>Minimum received (1% slippage):</span>
								<strong>{(Number(toAmount) * 0.99).toFixed(6)} {getTokenSymbol(toToken)}</strong>
							</QuoteRow>
						</QuoteBox>
					)}

					{/* Error/Success Messages */}
					{swapError && (
						<StatusBox type="error">
							❌ {swapError}
						</StatusBox>
					)}

					{swapSuccess && (
						<StatusBox type="success">
							✅ Swap executed successfully!
						</StatusBox>
					)}

					{/* Swap Button */}
					<MainButton
						onClick={handleSwap}
						disabled={!canSwap}
					>
						{!activeAccount ? 'Connect Wallet' :
						 isSwapping ? 'Swapping...' :
						 !fromAmount ? 'Enter an amount' :
						 fromToken === toToken ? 'Select different tokens' :
						 'Swap'}
					</MainButton>

					{/* TOKEN SELECTOR MODAL */}
					{isModalOpen && (
						<ModalOverlay onClick={() => setIsModalOpen(false)}>
							<ModalContent onClick={(e) => e.stopPropagation()}>
								<h3 style={{marginTop:0, marginBottom: '16px'}}>Select a token</h3>
								{tokens.map((token) => (
									<TokenListRow
										key={token.contractHash}
										onClick={() => handleSelectToken(token.contractHash)}
									>
										<TokenInfo>
											<TokenIconPlaceholder />
											<div>
												<TokenSymbol>{token.symbol}</TokenSymbol>
												<br />
												<TokenName>{token.name}</TokenName>
											</div>
										</TokenInfo>
										<span>{getTokenBalance(token.contractHash)}</span>
									</TokenListRow>
								))}
							</ModalContent>
						</ModalOverlay>
					)}

				</SwapCard>
			</SwapContainer>
		</PageLayout>
	);
};

export default SwapScene;
