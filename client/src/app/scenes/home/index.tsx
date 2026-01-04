import styled from 'styled-components';
import { FlexColumn, FlexRow } from '@make-software/cspr-design';
import { PageLayout } from '../../components';
import { Link } from '../../components/link/link';
import { SWAP_PATH, POOLS_PATH, POSITIONS_PATH } from '../../router/paths';

const HeroSection = styled(FlexColumn)(({ theme }) => ({
  padding: '80px 20px',
  textAlign: 'center',
  background: `linear-gradient(135deg, ${theme.dexColors.peachLight} 0%, ${theme.dexColors.ash} 100%)`,
  borderRadius: '24px',
  margin: '20px',
  maxWidth: '1200px',
}));

const HeroTitle = styled.h1(({ theme }) => ({
  fontSize: '48px',
  fontWeight: '700',
  color: theme.dexColors.chocolateDark,
  marginBottom: '16px',
  letterSpacing: '-0.02em',
}));

const HeroSubtitle = styled.p(({ theme }) => ({
  fontSize: '20px',
  
  color: theme.dexColors.chocolate,
  marginBottom: '40px',
  maxWidth: '600px',
  lineHeight: '1.5',
}));

const ActionButtons = styled(FlexRow)(({ theme }) => ({
  gap: '16px',
  justifyContent: 'center',
  flexWrap: 'wrap',
}));

const ActionButton = styled(Link)(({ theme }) => ({
  padding: '16px 32px',
  backgroundColor: theme.dexColors.chocolate,
  color: theme.dexColors.white,
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '16px',
  transition: 'all 0.2s ease',
  border: 'none',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.dexColors.chocolateDark,
    transform: 'translateY(-2px)',
  },
}));

const StatsGrid = styled(FlexRow)(({ theme }) => ({
  gap: '24px',
  marginTop: '60px',
  justifyContent: 'center',
  flexWrap: 'wrap',
}));

const StatCard = styled(FlexColumn)(({ theme }) => ({
  backgroundColor: theme.dexColors.white,
  padding: '24px',
  borderRadius: '16px',
  minWidth: '200px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  border: `1px solid ${theme.dexColors.ashLight}`,
}));

const StatValue = styled.div(({ theme }) => ({
  fontSize: '32px',
  fontWeight: '700',
  color: theme.dexColors.chocolate,
  marginBottom: '8px',
}));

const StatLabel = styled.div(({ theme }) => ({
  fontSize: '14px',
  color: theme.dexColors.ashDark,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}));

const HomeScene = () => {
  return (
    <PageLayout>
      <HeroSection>
        <HeroTitle>Uzzy3 DEX</HeroTitle>
        <HeroSubtitle>
          Trade, provide liquidity, and earn rewards on Casper&apos;s most advanced decentralized exchange
        </HeroSubtitle>
        <ActionButtons>
          <ActionButton to={SWAP_PATH}>Start Trading</ActionButton>
          <ActionButton to={POOLS_PATH}>Explore Pools</ActionButton>
          <ActionButton to={POSITIONS_PATH}>Manage Positions</ActionButton>
        </ActionButtons>
        
        <StatsGrid>
          <StatCard>
            <StatValue>$2.4M</StatValue>
            <StatLabel>Total Volume</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>$890K</StatValue>
            <StatLabel>Total Liquidity</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>12</StatValue>
            <StatLabel>Active Pools</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>156</StatValue>
            <StatLabel>Total Users</StatLabel>
          </StatCard>
        </StatsGrid>
      </HeroSection>
    </PageLayout>
  );
};

export default HomeScene;