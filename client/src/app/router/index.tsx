import { BrowserRouter, Route, Routes } from 'react-router-dom';
import styled from 'styled-components';
import {
	HOME_PATH,
	SWAP_PATH,
	POOLS_PATH,
	POOL_DETAIL_PATH,
	POSITIONS_PATH,
	ANALYTICS_PATH,
	PORTFOLIO_PATH,
	MINT_PATH,
} from './paths';
import { FlexColumn } from '@make-software/cspr-design';
import { PageHeader } from '../components';
import HomeScene from '../scenes/home';
import SwapScene from '../scenes/swap';
import PoolsScene from '../scenes/pools';
import PoolDetailScene from '../scenes/pool-detail';
import PositionsScene from '../scenes/positions';
import AnalyticsScene from '../scenes/analytics';
import PortfolioScene from '../scenes/portfolio';
import MintScene from '../scenes/mint';

export const Container = styled(FlexColumn)(({ theme }) => ({
	minWidth: theme.minWidth,
	alignItems: 'center',
	backgroundColor: theme.styleguideColors.backgroundSecondary,
	color: theme.styleguideColors.contentPrimary,
	minHeight: '100vh',
}));

const Router = () => {
	return (
		<BrowserRouter>
			<Container>
				<PageHeader />
				<Routes>
					<Route path={HOME_PATH} element={<HomeScene />} />
					<Route path={SWAP_PATH} element={<SwapScene />} />
					<Route path={POOLS_PATH} element={<PoolsScene />} />
					<Route path={POOL_DETAIL_PATH} element={<PoolDetailScene />} />
					<Route path={POSITIONS_PATH} element={<PositionsScene />} />
					<Route path={MINT_PATH} element={<MintScene />} />
					<Route path={ANALYTICS_PATH} element={<AnalyticsScene />} />
					<Route path={PORTFOLIO_PATH} element={<PortfolioScene />} />
				</Routes>
			</Container>
		</BrowserRouter>
	);
};

export default Router;
