import styled from 'styled-components';
import { Link } from '../link/link';
import { MainMenu, MainMenuItem } from '@make-software/cspr-design';
import {
	HOME_PATH,
	SWAP_PATH,
	POOLS_PATH,
	POSITIONS_PATH,
	ANALYTICS_PATH,
	PORTFOLIO_PATH,
	MINT_PATH,
} from '../../router/paths';

const MainMenuContainer = styled.div(({ theme }) =>
	theme.withMedia({
		position: 'relative',
		padding: 0,
	
		paddingBottom: [19, 19, 0],
		width: ['100%', '100%', 'auto'],
		'& li': {
			':last-child': {
				paddingRight: 0,
			},
		},
	})
);

export const NavigationMenu = () => {
	return (
		<MainMenuContainer>
			<MainMenu>
				<MainMenuItem>
					<Link  to={HOME_PATH}>Home</Link>
				</MainMenuItem>
				<MainMenuItem>
					<Link to={SWAP_PATH}>Swap</Link>
				</MainMenuItem>
				<MainMenuItem>
					<Link to={POOLS_PATH}>Pools</Link>
				</MainMenuItem>
				<MainMenuItem>
					<Link to={POSITIONS_PATH}>Positions</Link>
				</MainMenuItem>
				<MainMenuItem>
					<Link to={MINT_PATH}>Mint Tokens</Link>
				</MainMenuItem>
				<MainMenuItem>
					<Link to={ANALYTICS_PATH}>Analytics</Link>
				</MainMenuItem>
				<MainMenuItem>
					<Link to={PORTFOLIO_PATH}>Portfolio</Link>
				</MainMenuItem>
			</MainMenu>
		</MainMenuContainer>
	);
};

export default NavigationMenu;
