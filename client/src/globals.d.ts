type GlobalConfig = {
	lottery_app_contract_package_hash: string;
	lottery_api_url: string;
	lottery_api_ws_url: string;
	cspr_click_app_name: string;
	cspr_click_app_id: string;
	cspr_live_url: string;
	cspr_chain_name: string;
	lottery_ticket_price_in_cspr: number;
	gas_price_in_cspr: number;
	// DEX Configuration
	dex_contract_package_hash: string;
	router_contract_package_hash: string;
	position_manager_contract_package_hash: string;
	// Test tokens (will be replaced with real tokens)
	wcspr_token_contract_hash: string;
	usdt_token_contract_hash: string;
	cdai_token_contract_hash: string;
};

declare const config: GlobalConfig;

declare module '*.svg';

declare module '*.png';
declare module 'facepaint';
declare module 'big.js';
