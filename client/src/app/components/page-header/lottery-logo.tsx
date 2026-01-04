import { HOME_PATH } from '../../router/paths';
import RouterLink from '../link/router-link';
import { NavLink } from '@make-software/cspr-design';
import styled from 'styled-components';

const DexLogo = styled.div(({ theme }) => ({
  fontSize: '28px',
  fontWeight: '800',
  color: theme.dexColors.chocolate,
  letterSpacing: '-0.02em',
  textDecoration: 'none',
}));

const LogoComponent = () => {
  return (
    <RouterLink
      to={HOME_PATH}
      render={props => (
        <NavLink>
          <DexLogo {...props}>Uzzy3 DEX</DexLogo>
        </NavLink>
      )}
    />
  );
};

export default LogoComponent;
