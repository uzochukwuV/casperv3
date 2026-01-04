import styled from 'styled-components';
import { FlexColumn } from '@make-software/cspr-design';
import { PageLayout } from '../../components';

const Container = styled(FlexColumn)(({ theme }) => ({
  alignItems: 'center',
  padding: '80px 20px',
  textAlign: 'center',
}));

const Title = styled.h1(({ theme }) => ({
  fontSize: '32px',
  fontWeight: '700',
  color: theme.dexColors.chocolateDark,
  marginBottom: '16px',
}));

const Subtitle = styled.p(({ theme }) => ({
  fontSize: '18px',
  color: theme.dexColors.ashDark,
}));

const AnalyticsScene = () => {
  return (
    <PageLayout>
      <Container>
        <Title>Analytics</Title>
        <Subtitle>Coming Soon</Subtitle>
      </Container>
    </PageLayout>
  );
};

export default AnalyticsScene;