import styled from 'styled-components';
import { FlexColumn, FlexRow } from '@make-software/cspr-design';
import { PageLayout } from '../../components';
import { useState } from 'react';

const SwapContainer = styled(FlexColumn)(({ theme }) => ({
  maxWidth: '480px',
  margin: '40px auto',
  padding: '0 20px',
}));

const SwapCard = styled(FlexColumn)(({ theme }) => ({
  backgroundColor: theme.dexColors.white,
  borderRadius: '24px',
  padding: '24px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  border: `1px solid ${theme.dexColors.ashLight}`,
}));

const SwapHeader = styled(FlexRow)(({ theme }) => ({
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
}));

const SwapTitle = styled.h2(({ theme }) => ({
  fontSize: '24px',
  fontWeight: '700',
  color: theme.dexColors.chocolateDark,
  margin: 0,
}));

const TokenInput = styled(FlexColumn)(({ theme }) => ({
  backgroundColor: theme.dexColors.gray,
  borderRadius: '16px',
  padding: '16px',
  marginBottom: '8px',
}));

const TokenSelector = styled.button(({ theme }) => ({
  backgroundColor: theme.dexColors.white,
  border: `1px solid ${theme.dexColors.ashLight}`,
  borderRadius: '12px',
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  fontWeight: '600',
  color: theme.dexColors.chocolateDark,
}));

const AmountInput = styled.input(({ theme }) => ({
  backgroundColor: 'transparent',
  border: 'none',
  fontSize: '24px',
  fontWeight: '600',
  color: theme.dexColors.chocolateDark,
  textAlign: 'right',
  outline: 'none',
  width: '100%',
}));

const SwapButton = styled.button(({ theme }) => ({
  backgroundColor: theme.dexColors.chocolate,
  color: theme.dexColors.white,
  border: 'none',
  borderRadius: '16px',
  padding: '16px',
  fontSize: '18px',
  fontWeight: '600',
  cursor: 'pointer',
  marginTop: '16px',
}));

const SwapScene = () => {
  const [fromAmount, setFromAmount] = useState('');

  return (
    <PageLayout>
      <SwapContainer>
        <SwapCard>
          <SwapHeader>
            <SwapTitle>Swap</SwapTitle>
          </SwapHeader>

          <TokenInput>
            <FlexRow justify="space-between" align="center">
              <TokenSelector>CSPR ▼</TokenSelector>
              <AmountInput
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
              />
            </FlexRow>
          </TokenInput>

          <TokenInput>
            <FlexRow justify="space-between" align="center">
              <TokenSelector>USDT ▼</TokenSelector>
              <AmountInput placeholder="0.0" readOnly />
            </FlexRow>
          </TokenInput>

          <SwapButton>Swap</SwapButton>
        </SwapCard>
      </SwapContainer>
    </PageLayout>
  );
};

export default SwapScene;