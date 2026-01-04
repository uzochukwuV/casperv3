import styled from 'styled-components';
import { FlexColumn, FlexRow } from '@make-software/cspr-design';
import { PageLayout } from '../../components';

const PositionsContainer = styled(FlexColumn)(({ theme }) => ({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '40px 20px',
}));

const PositionsTitle = styled.h1(({ theme }) => ({
  fontSize: '32px',
  fontWeight: '700',
  color: theme.dexColors.chocolateDark,
  marginBottom: '32px',
}));

const PositionCard = styled(FlexColumn)(({ theme }) => ({
  backgroundColor: theme.dexColors.white,
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  border: `1px solid ${theme.dexColors.ashLight}`,
}));

const PositionHeader = styled(FlexRow)(({ theme }) => ({
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
}));

const TokenPair = styled.div(({ theme }) => ({
  fontSize: '20px',
  fontWeight: '700',
  color: theme.dexColors.chocolateDark,
}));

const PositionId = styled.div(({ theme }) => ({
  fontSize: '14px',
  color: theme.dexColors.ashDark,
  backgroundColor: theme.dexColors.gray,
  padding: '4px 8px',
  borderRadius: '8px',
}));

const PositionStats = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '16px',
}));

const StatItem = styled(FlexColumn)(({ theme }) => ({
  gap: '4px',
}));

const StatLabel = styled.span(({ theme }) => ({
  fontSize: '12px',
  color: theme.dexColors.ashDark,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}));

const StatValue = styled.span(({ theme }) => ({
  fontSize: '16px',
  fontWeight: '600',
  color: theme.dexColors.chocolateDark,
}));

const ActionButtons = styled(FlexRow)(({ theme }) => ({
  gap: '12px',
  marginTop: '16px',
}));

const ActionButton = styled.button(({ theme }) => ({
  padding: '8px 16px',
  borderRadius: '8px',
  border: `1px solid ${theme.dexColors.chocolate}`,
  backgroundColor: 'transparent',
  color: theme.dexColors.chocolate,
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.dexColors.chocolate,
    color: theme.dexColors.white,
  },
}));

const EmptyState = styled(FlexColumn)(({ theme }) => ({
  alignItems: 'center',
  padding: '80px 20px',
  textAlign: 'center',
}));

const EmptyTitle = styled.h3(({ theme }) => ({
  fontSize: '24px',
  color: theme.dexColors.chocolateDark,
  marginBottom: '16px',
}));

const EmptyText = styled.p(({ theme }) => ({
  fontSize: '16px',
  color: theme.dexColors.ashDark,
  marginBottom: '24px',
}));

const positions = [
  {
    id: '#1234',
    pair: 'CSPR/USDT',
    liquidity: '$1,245',
    fees: '$23.45',
    range: '$0.95 - $1.05',
    status: 'In Range'
  },
  {
    id: '#5678',
    pair: 'USDT/USDC',
    liquidity: '$856',
    fees: '$12.34',
    range: '$0.998 - $1.002',
    status: 'Out of Range'
  },
];

const PositionsScene = () => {
  return (
    <PageLayout>
      <PositionsContainer>
        <PositionsTitle>Your Positions</PositionsTitle>

        {positions.length > 0 ? (
          positions.map((position) => (
            <PositionCard key={position.id}>
              <PositionHeader>
                <TokenPair>{position.pair}</TokenPair>
                <PositionId>{position.id}</PositionId>
              </PositionHeader>

              <PositionStats>
                <StatItem>
                  <StatLabel>Liquidity</StatLabel>
                  <StatValue>{position.liquidity}</StatValue>
                </StatItem>
                <StatItem>
                  <StatLabel>Unclaimed Fees</StatLabel>
                  <StatValue>{position.fees}</StatValue>
                </StatItem>
                <StatItem>
                  <StatLabel>Price Range</StatLabel>
                  <StatValue>{position.range}</StatValue>
                </StatItem>
                <StatItem>
                  <StatLabel>Status</StatLabel>
                  <StatValue style={{ 
                    color: position.status === 'In Range' ? '#4CAF50' : '#FF9800' 
                  }}>
                    {position.status}
                  </StatValue>
                </StatItem>
              </PositionStats>

              <ActionButtons>
                <ActionButton>Collect Fees</ActionButton>
                <ActionButton>Add Liquidity</ActionButton>
                <ActionButton>Remove Liquidity</ActionButton>
              </ActionButtons>
            </PositionCard>
          ))
        ) : (
          <EmptyState>
            <EmptyTitle>No positions found</EmptyTitle>
            <EmptyText>Create your first liquidity position to start earning fees</EmptyText>
            <ActionButton>Create Position</ActionButton>
          </EmptyState>
        )}
      </PositionsContainer>
    </PageLayout>
  );
};

export default PositionsScene;