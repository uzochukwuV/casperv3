import styled from 'styled-components';
import { FlexColumn, FlexRow } from '@make-software/cspr-design';
import { PageLayout } from '../../components';

const PoolsContainer = styled(FlexColumn)(({ theme }) => ({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '40px 20px',
}));

const PoolsHeader = styled(FlexRow)(({ theme }) => ({
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '32px',
}));

const PoolsTitle = styled.h1(({ theme }) => ({
  fontSize: '32px',
  fontWeight: '700',
  color: theme.dexColors.chocolateDark,
  margin: 0,
}));

const AddLiquidityButton = styled.button(({ theme }) => ({
  backgroundColor: theme.dexColors.chocolate,
  color: theme.dexColors.white,
  border: 'none',
  borderRadius: '12px',
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
}));

const PoolsGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
  gap: '24px',
}));

const PoolCard = styled(FlexColumn)(({ theme }) => ({
  backgroundColor: theme.dexColors.white,
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  border: `1px solid ${theme.dexColors.ashLight}`,
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
  },
}));

const PoolHeader = styled(FlexRow)(({ theme }) => ({
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
}));

const TokenPair = styled.div(({ theme }) => ({
  fontSize: '20px',
  fontWeight: '700',
  color: theme.dexColors.chocolateDark,
}));

const FeeTag = styled.div(({ theme }) => ({
  backgroundColor: theme.dexColors.peachLight,
  color: theme.dexColors.chocolate,
  padding: '4px 8px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: '600',
}));

const PoolStats = styled(FlexColumn)(({ theme }) => ({
  gap: '12px',
}));

const StatRow = styled(FlexRow)(({ theme }) => ({
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const StatLabel = styled.span(({ theme }) => ({
  fontSize: '14px',
  color: theme.dexColors.ashDark,
}));

const StatValue = styled.span(({ theme }) => ({
  fontSize: '14px',
  fontWeight: '600',
  color: theme.dexColors.chocolateDark,
}));

const pools = [
  { pair: 'CSPR/USDT', fee: '0.3%', tvl: '$245K', volume: '$89K', apr: '12.5%' },
  { pair: 'USDT/USDC', fee: '0.05%', tvl: '$156K', volume: '$45K', apr: '8.2%' },
  { pair: 'CSPR/ETH', fee: '0.3%', tvl: '$98K', volume: '$23K', apr: '15.8%' },
  { pair: 'WBTC/USDT', fee: '0.3%', tvl: '$67K', volume: '$12K', apr: '9.4%' },
];

const PoolsScene = () => {
  return (
    <PageLayout>
      <PoolsContainer>
        <PoolsHeader>
          <PoolsTitle>Liquidity Pools</PoolsTitle>
          <AddLiquidityButton>+ Add Liquidity</AddLiquidityButton>
        </PoolsHeader>

        <PoolsGrid>
          {pools.map((pool, index) => (
            <PoolCard key={index}>
              <PoolHeader>
                <TokenPair>{pool.pair}</TokenPair>
                <FeeTag>{pool.fee}</FeeTag>
              </PoolHeader>
              
              <PoolStats>
                <StatRow>
                  <StatLabel>TVL</StatLabel>
                  <StatValue>{pool.tvl}</StatValue>
                </StatRow>
                <StatRow>
                  <StatLabel>24h Volume</StatLabel>
                  <StatValue>{pool.volume}</StatValue>
                </StatRow>
                <StatRow>
                  <StatLabel>APR</StatLabel>
                  <StatValue style={{ color: '#4CAF50' }}>{pool.apr}</StatValue>
                </StatRow>
              </PoolStats>
            </PoolCard>
          ))}
        </PoolsGrid>
      </PoolsContainer>
    </PageLayout>
  );
};

export default PoolsScene;