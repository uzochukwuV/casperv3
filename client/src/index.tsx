import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ClickProvider } from '@make-software/csprclick-ui';
import { CONTENT_MODE, CsprClickInitOptions } from '@make-software/csprclick-core-types';
import App from './App';

const clickOptions: CsprClickInitOptions = {
	appName: "app",
	contentMode: CONTENT_MODE.IFRAME,
	providers: [
		'casper-wallet',
		'ledger',
		'torus-wallet',
		'casperdash',
		'metamask-snap',
		'casper-signer',
	],
	appId: "2afade1f-e0e4-4d1e-af2a-b7241a98",
};

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);
root.render(
	<React.StrictMode>
		<ClickProvider options={clickOptions}>
			<App />
		</ClickProvider>
	</React.StrictMode>
);
