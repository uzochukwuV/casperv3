import { AccountMenuItem as CsprClickAccountMenuItem } from '@make-software/csprclick-ui';
import CupIcon from '../../../../assets/icons/cup.svg';
import { useNavigate } from 'react-router-dom';
import { PORTFOLIO_PATH } from '../../../router/paths';

const AccountMenuItem = () => {
	const navigate = useNavigate();

	const navigateToPortfolio = () => {
		navigate(PORTFOLIO_PATH);
	};
	return (
		<CsprClickAccountMenuItem
			key={2}
			onClick={navigateToPortfolio}
			icon={CupIcon}
			label={'Portfolio'}
		/>
	);
};

export default AccountMenuItem;
