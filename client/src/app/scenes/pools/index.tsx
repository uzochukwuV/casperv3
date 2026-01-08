import React, { useState } from 'react';
import styled from 'styled-components';
import { FlexColumn, FlexRow, Button } from '@make-software/cspr-design';
import { PageLayout } from '../../components';
import CreatePoolModal from './CreatePoolModal';
import useCsprClick from '../../services/hooks/use-cspr-click';

// --- Icons ---
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const FilterIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
);

// --- Styled Components ---

const PoolsContainer = styled(FlexColumn)`
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px;
  gap: 32px;
`;

// -- Header & Controls --
const HeaderSection = styled(FlexColumn)`
  gap: 24px;
`;

const TopRow = styled(FlexRow)`
  justify-content: space-between;
  align-items: center;
`;

const PoolsTitle = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: ${({ theme }) => theme.dexColors.chocolateDark};
  margin: 0;
  letter-spacing: -0.02em;
`;

const ControlsBar = styled(FlexRow)`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 280px;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.dexColors.ashLight};
  background-color: ${({ theme }) => theme.dexColors.white};
  font-size: 16px;
  color: ${({ theme }) => theme.dexColors.chocolateDark};
  outline: none;
  transition: 0.2s;

  &:focus {
    border-color: ${({ theme }) => theme.dexColors.chocolate};
    box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.dexColors.ash};
  }
`;

const IconWrapper = styled.div`
  position: absolute;
  left: 14px;
  display: flex;
`;

const FilterButton = styled.button`
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.dexColors.ashLight};
  background-color: ${({ theme }) => theme.dexColors.white};
  color: ${({ theme }) => theme.dexColors.chocolateDark};
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  
  &:hover { background-color: ${({ theme }) => theme.dexColors.gray}; }
`;

const CreateButton = styled(Button)`
  border-radius: 14px;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 600;
  background-color: ${({ theme }) => theme.dexColors.chocolate};
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
  
  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }
`;

// -- Grid & Cards --

const PoolsGrid = styled.div`
  display: grid;
  gridTemplateColumns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
`;

const PoolCard = styled(FlexColumn)`
  background-color: ${({ theme }) => theme.dexColors.white};
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: 1px solid ${({ theme }) => theme.dexColors.ashLight};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.08);
    border-color: ${({ theme }) => theme.dexColors.chocolate};
  }
`;

const CardTop = styled(FlexRow)`
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
`;

const PairInfo = styled(FlexRow)`
  align-items: center;
`;

// Overlapping Circles
const IconStack = styled.div`
  position: relative;
  width: 48px; height: 32px; 
  margin-right: 12px;
`;
const TokenIcon = styled.div`
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 2px solid #fff;
  position: absolute;
  top: 0;
  background: ${props => props.color || '#ccc'};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:first-child { left: 0; z-index: 1; }
  &:last-child { left: 20px; z-index: 2; }
`;

const PairName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.dexColors.chocolateDark};
  line-height: 1.2;
`;

const FeeBadge = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.dexColors.ashDark};
  background-color: ${({ theme }) => theme.dexColors.gray};
  padding: 2px 6px;
  border-radius: 6px;
  margin-top: 4px;
  display: inline-block;
`;

const AprBadge = styled.div`
  background-color: rgba(76, 175, 80, 0.1);
  color: #2E7D32;
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.dexColors.gray};
`;

const StatBox = styled(FlexColumn)`
  gap: 4px;
`;

const StatLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.dexColors.ash};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.dexColors.chocolateDark};
`;


// --- Data & Component ---

const poolsData = [
  { pair: 'CSPR/USDT', fee: '0.3%', tvl: '$245,120', volume: '$89,400', apr: '12.5%', color1: '#FF6B6B', color2: '#26A17B' },
  { pair: 'USDT/USDC', fee: '0.05%', tvl: '$156,000', volume: '$45,230', apr: '8.2%', color1: '#26A17B', color2: '#29323c' },
  { pair: 'CSPR/ETH', fee: '0.3%', tvl: '$98,400', volume: '$23,100', apr: '15.8%', color1: '#FF6B6B', color2: '#627EEA' },
  { pair: 'WBTC/USDT', fee: '0.3%', tvl: '$67,800', volume: '$12,500', apr: '9.4%', color1: '#F7931A', color2: '#26A17B' },
  { pair: 'ETH/USDC', fee: '0.05%', tvl: '$1.2M', volume: '$500K', apr: '4.5%', color1: '#627EEA', color2: '#29323c' },
];

const PoolsScene = () => {
  const { activeAccount } = useCsprClick();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPools = poolsData.filter(p => 
    p.pair.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageLayout>
      <PoolsContainer>
        
        <HeaderSection>
          <TopRow>
            <PoolsTitle>Liquidity Pools</PoolsTitle>
            <CreateButton onClick={() => setShowCreateModal(true)}>
               <PlusIcon /> New Position
            </CreateButton>
          </TopRow>

          <ControlsBar>
            <SearchWrapper>
              <IconWrapper><SearchIcon /></IconWrapper>
              <SearchInput 
                placeholder="Search by token or pair..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchWrapper>
            <FilterButton>
              <FilterIcon /> Filters
            </FilterButton>
          </ControlsBar>
        </HeaderSection>

        <PoolsGrid>
          {filteredPools.map((pool, index) => (
            <PoolCard key={index}>
              <CardTop>
                <PairInfo>
                  <IconStack>
                    <TokenIcon color={pool.color1} />
                    <TokenIcon color={pool.color2} />
                  </IconStack>
                  <FlexColumn>
                    <PairName>{pool.pair}</PairName>
                    <FeeBadge>{pool.fee}</FeeBadge>
                  </FlexColumn>
                </PairInfo>
                <AprBadge>
                    ⚡ {pool.apr}
                </AprBadge>
              </CardTop>

              <StatsGrid>
                <StatBox>
                  <StatLabel>TVL</StatLabel>
                  <StatValue>{pool.tvl}</StatValue>
                </StatBox>
                <StatBox>
                  <StatLabel>24H Volume</StatLabel>
                  <StatValue>{pool.volume}</StatValue>
                </StatBox>
              </StatsGrid>
            </PoolCard>
          ))}
        </PoolsGrid>

      </PoolsContainer>

      {showCreateModal && (
        <CreatePoolModal onClose={() => setShowCreateModal(false)} activeAccount={activeAccount} />
      )}
    </PageLayout>
  );
};

export default PoolsScene;