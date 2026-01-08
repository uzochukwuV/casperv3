import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { FlexColumn, FlexRow } from '@make-software/cspr-design';
import { PageLayout } from '../../components';

// --- Icons (Inline for portability) ---
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);

const WalletIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
);

const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

// --- Styled Components ---

const PageWrapper = styled(FlexColumn)`
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 20px;
  gap: 24px;
`;

// -- Header Section --
const HeaderRow = styled(FlexRow)`
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 8px;
`;

const PageTitle = styled.h1`
  font-size: 32px;
  font-weight: 600;
  color: ${({ theme }) => theme.dexColors.chocolateDark};
  margin: 0;
  letter-spacing: -0.02em;
`;

const ControlsRow = styled(FlexRow)`
  gap: 12px;
`;

// -- Filter Dropdown --
const FilterButton = styled.button`
  background-color: ${({ theme }) => theme.dexColors.white};
  border: 1px solid ${({ theme }) => theme.dexColors.ashLight};
  border-radius: 12px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.dexColors.chocolateDark};
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.dexColors.gray};
  }
`;

const PrimaryButton = styled.button`
  background-color: ${({ theme }) => theme.dexColors.chocolate};
  color: ${({ theme }) => theme.dexColors.white};
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
  transition: transform 0.1s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }
`;

// -- The Position Card --
const Card = styled(FlexColumn)`
  background-color: ${({ theme }) => theme.dexColors.white};
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.dexColors.ashLight};
  padding: 0;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  overflow: hidden;

  &:hover {
    border-color: ${({ theme }) => theme.dexColors.chocolate};
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    transform: translateY(-2px);
  }
`;

const CardTop = styled(FlexRow)`
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.dexColors.gray};
`;

const PairInfo = styled(FlexRow)`
  align-items: center;
  gap: 12px;
`;

// Overlapping Icons
const IconStack = styled.div`
  position: relative;
  width: 40px; 
  height: 28px; 
  margin-right: 8px;
`;
const TokenIcon = styled.div`
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2px solid #fff;
  position: absolute;
  top: 0;
  
  // Dynamic coloring for mock icons
  background: ${props => props.color || '#ccc'};
  
  &:first-child { left: 0; z-index: 1; }
  &:last-child { left: 18px; z-index: 2; }
`;

const PairName = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.dexColors.chocolateDark};
`;

const FeeTier = styled.span`
  background: ${({ theme }) => theme.dexColors.gray};
  color: ${({ theme }) => theme.dexColors.chocolate};
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 8px;
  margin-left: 8px;
`;

const StatusBadge = styled(FlexRow)`
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  
  ${({ status, theme }) => status === 'In Range' ? css`
    color: #10B981;
    &::before {
      content: ''; width: 8px; height: 8px; background: #10B981; border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }
  ` : css`
    color: #F59E0B;
    &::before {
      content: ''; width: 8px; height: 8px; background: #F59E0B; border-radius: 50%;
    }
  `}
`;

const CardBody = styled(FlexRow)`
  padding: 20px 24px;
  gap: 40px;
  flex-wrap: wrap;
`;

const StatBox = styled(FlexColumn)`
  gap: 6px;
  min-width: 120px;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.dexColors.ashDark};
  text-transform: uppercase;
`;

const Value = styled.span`
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.dexColors.chocolateDark};
`;

const FeesValue = styled(Value)`
  color: ${({ theme }) => theme.dexColors.chocolate}; // Highlight fees
`;

const CollectButton = styled.button`
  margin-left: auto; /* Push to right */
  background: transparent;
  border: 1px solid ${({ theme }) => theme.dexColors.chocolate};
  color: ${({ theme }) => theme.dexColors.chocolate};
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: ${({ theme }) => theme.dexColors.chocolate};
    color: white;
  }
`;

// -- Empty State --
const EmptyState = styled(FlexColumn)`
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  background: ${({ theme }) => theme.dexColors.white};
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.dexColors.ashLight};
  text-align: center;
`;

// --- Component ---

const positionsData = [
  {
    id: '1234',
    tokenA: 'CSPR',
    tokenB: 'USDT',
    tier: '0.3%',
    liquidity: '$1,245.00',
    fees: '$23.45',
    min: '0.95',
    max: '1.05',
    status: 'In Range',
    colorA: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    colorB: 'linear-gradient(135deg, #26A17B 0%, #4FD1C5 100%)'
  },
  {
    id: '5678',
    tokenA: 'USDT',
    tokenB: 'USDC',
    tier: '0.05%',
    liquidity: '$856.00',
    fees: '$0.00',
    min: '0.998',
    max: '1.002',
    status: 'Out of Range',
    colorA: 'linear-gradient(135deg, #26A17B 0%, #4FD1C5 100%)',
    colorB: 'linear-gradient(135deg, #29323c 0%, #485563 100%)'
  },
];

const PositionsScene = () => {
  const [filter, setFilter] = useState('All'); // Mock filter state

  return (
    <PageLayout>
      <PageWrapper>
        
        {/* Header with Title and Actions */}
        <HeaderRow>
          <PageTitle>Pools</PageTitle>
          <ControlsRow>
             {/* Mock Filter Dropdown */}
            <FilterButton onClick={() => setFilter(filter === 'All' ? 'Closed' : 'All')}>
              {filter === 'All' ? 'Active' : 'Closed'} <ChevronDown />
            </FilterButton>
            
            <PrimaryButton>
              <PlusIcon /> New Position
            </PrimaryButton>
          </ControlsRow>
        </HeaderRow>

        {/* Positions List */}
        {positionsData.length > 0 ? (
          positionsData.map((pos) => (
            <Card key={pos.id}>
              <CardTop>
                <PairInfo>
                  <IconStack>
                    <TokenIcon color={pos.colorA} />
                    <TokenIcon color={pos.colorB} />
                  </IconStack>
                  <FlexRow align="baseline" gap="4px">
                    <PairName>{pos.tokenA}/{pos.tokenB}</PairName>
                    <FeeTier>{pos.tier}</FeeTier>
                  </FlexRow>
                </PairInfo>
                <StatusBadge status={pos.status}>{pos.status}</StatusBadge>
              </CardTop>

              <CardBody>
                <StatBox>
                  <Label>Liquidity</Label>
                  <Value>{pos.liquidity}</Value>
                </StatBox>
                
                <StatBox>
                  <Label>Unclaimed Fees</Label>
                  <FeesValue>{pos.fees}</FeesValue>
                </StatBox>

                <StatBox>
                  <Label>Range</Label>
                  <Value style={{fontSize: '16px'}}>{pos.min} ↔ {pos.max}</Value>
                </StatBox>

                {/* Only show collect button if there are fees */}
                {pos.fees !== '$0.00' && (
                  <CollectButton>Collect</CollectButton>
                )}
              </CardBody>
            </Card>
          ))
        ) : (
          <EmptyState>
            <WalletIcon />
            <h3 style={{ margin: '16px 0 8px', color: '#333' }}>Your active V3 liquidity positions will appear here.</h3>
            <PrimaryButton style={{marginTop: '16px'}}>Create a Position</PrimaryButton>
          </EmptyState>
        )}
      </PageWrapper>
    </PageLayout>
  );
};

export default PositionsScene;