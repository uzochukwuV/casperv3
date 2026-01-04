import styled, { useTheme } from 'styled-components';
import {
	BodyText,
	FlexBox,
	FlexColumn,
	FlexRow,
	HeaderText,
	Text,
} from '@make-software/cspr-design';
import { InfoBadge } from '../../components/info-badge/info-badge';

const HeroContainer = styled(FlexRow)(({ theme }) =>
	theme.withMedia({
		background: 'linear-gradient(135deg, #FF0011 0%, #C5000D 100%)',
		width: '100%',
		justifyContent: 'center',
		padding: '20px 0 28px',
		overflow: 'hidden',
		position: 'relative',
	})
);

const BackgroundPattern = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-image: radial-gradient(
			circle at 25px 25px,
			rgba(255, 255, 255, 0.1) 2%,
			transparent 0%
		),
		radial-gradient(
			circle at 75px 75px,
			rgba(255, 255, 255, 0.1) 2%,
			transparent 0%
		);
	background-size: 100px 100px;
	opacity: 0.3;
`;

const HeroInnerContainer = styled(FlexBox)(({ theme }) =>
	theme.withMedia({
		flexDirection: ['column', 'column', 'row', 'row'],
		justifyContent: 'space-between',
		alignItems: 'center',
		width: theme.maxWidth,
		padding: ['50px 16px 10px', '80px 32px 30px', '112px 56px', '112px 0'],
		position: 'relative',
		zIndex: 1,
	})
);

const LeftContainer = styled(FlexColumn)(({ theme }) =>
	theme.withMedia({
		width: ['100%', '100%', '60%', '60%'],
		alignItems: ['center', 'center', 'flex-start', 'flex-start'],
	})
);

const TitleText = styled(HeaderText)(({ theme }) =>
	theme.withMedia({
		color: '#FFFFFF',
		textAlign: ['center', 'center', 'left', 'left'],
		textShadow: '0 2px 10px rgba(0,0,0,0.2)',
		marginBottom: '16px',
	})
);

const IntroText = styled(BodyText)(({ theme }) =>
	theme.withMedia({
		textAlign: ['center', 'center', 'left', 'left'],
		color: 'rgba(255, 255, 255, 0.95)',
		maxWidth: '600px',
		lineHeight: '1.6',
	})
);

const RightContainer = styled(FlexColumn)(({ theme }) =>
	theme.withMedia({
		width: ['100%', '100%', '35%', '35%'],
		alignItems: ['center', 'center', 'flex-end', 'flex-end'],
		marginTop: [32, 32, 0, 0],
	})
);

const StatsCard = styled(FlexColumn)(({ theme }) => ({
	background: 'rgba(255, 255, 255, 0.15)',
	backdropFilter: 'blur(10px)',
	borderRadius: '16px',
	padding: '24px 32px',
	border: '1px solid rgba(255, 255, 255, 0.2)',
	boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
}));

const StatValue = styled(Text)({
	fontSize: '42px',
	fontWeight: 900,
	color: '#FFFFFF',
	textShadow: '0 2px 4px rgba(0,0,0,0.2)',
});

const StatLabel = styled(BodyText)({
	color: 'rgba(255, 255, 255, 0.85)',
	fontSize: '14px',
	marginTop: '8px',
});

const BadgeContainer = styled(FlexRow)(({ theme }) =>
	theme.withMedia({
		marginTop: [16, 16, 24, 24],
		flexWrap: 'wrap',
		gap: '12px',
		justifyContent: ['center', 'center', 'flex-start', 'flex-start'],
	})
);

const MintHero = () => {
	const theme = useTheme();

	return (
		<HeroContainer>
			<BackgroundPattern />
			<HeroInnerContainer>
				<LeftContainer itemsSpacing={8}>
					<TitleText scale={'lg'} size={3}>
						Mint Test Tokens
					</TitleText>
					<IntroText scale={'md'} size={3}>
						Get test tokens instantly for CasperSwap V3 testing. Mint
						TCSPR, USDT, or CDAI tokens to your wallet and start
						exploring concentrated liquidity pools, swaps, and yield
						farming.
					</IntroText>
					<BadgeContainer>
						<InfoBadge
							background={'rgba(255, 255, 255, 0.2)'}
							color={'#FFFFFF'}
							title={'✨ Instant Minting'}
						/>
						<InfoBadge
							background={'rgba(255, 255, 255, 0.2)'}
							color={'#FFFFFF'}
							title={'🔒 Testnet Only'}
						/>
						<InfoBadge
							background={'rgba(255, 255, 255, 0.2)'}
							color={'#FFFFFF'}
							title={'🚀 Free Tokens'}
						/>
					</BadgeContainer>
				</LeftContainer>
				<RightContainer>
					<StatsCard itemsSpacing={8}>
						<StatValue>3</StatValue>
						<StatLabel>Available Tokens</StatLabel>
					</StatsCard>
				</RightContainer>
			</HeroInnerContainer>
		</HeroContainer>
	);
};

export default MintHero;
