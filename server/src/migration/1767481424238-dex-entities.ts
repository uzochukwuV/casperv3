import { MigrationInterface, QueryRunner } from "typeorm";

export class DexEntities1767481424238 implements MigrationInterface {
    name = 'DexEntities1767481424238'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`plays\` (\`play_id\` varchar(255) NOT NULL, \`round_id\` varchar(255) NOT NULL, \`player_account_hash\` varchar(255) NOT NULL, \`prize_amount\` varchar(255) NOT NULL, \`jackpot_amount\` varchar(255) NOT NULL, \`is_jackpot\` tinyint NOT NULL, \`deploy_hash\` varchar(255) NOT NULL, \`timestamp\` datetime NOT NULL, UNIQUE INDEX \`IDX_3d00cc3519b513070a18f6d5f9\` (\`deploy_hash\`), PRIMARY KEY (\`play_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`pools\` (\`id\` int NOT NULL AUTO_INCREMENT, \`token0\` varchar(64) NOT NULL, \`token1\` varchar(64) NOT NULL, \`fee\` int NOT NULL, \`tickSpacing\` int NOT NULL, \`poolAddress\` varchar(64) NOT NULL, \`sqrtPriceX96\` varchar(78) NULL, \`tick\` int NULL, \`initialized\` tinyint NOT NULL DEFAULT 0, \`deployHash\` varchar(64) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_4282fef1090e3bd21e10e5a294\` (\`token0\`), INDEX \`IDX_5dad2551267245bd27765ffe17\` (\`token1\`), UNIQUE INDEX \`IDX_ff7863a08f35ea3c267672f610\` (\`token0\`, \`token1\`, \`fee\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`liquidity_events\` (\`id\` int NOT NULL AUTO_INCREMENT, \`eventType\` varchar(10) NOT NULL, \`poolId\` int NOT NULL, \`sender\` varchar(64) NOT NULL, \`owner\` varchar(64) NOT NULL, \`tickLower\` int NOT NULL, \`tickUpper\` int NOT NULL, \`amount\` varchar(39) NOT NULL, \`amount0\` varchar(78) NOT NULL, \`amount1\` varchar(78) NOT NULL, \`deployHash\` varchar(64) NOT NULL, \`timestamp\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_6bb7253790e304072e804b2bb2\` (\`eventType\`), INDEX \`IDX_851cd175bfdd45bdd03ec1c807\` (\`poolId\`), INDEX \`IDX_aade0a56c0221ccc808211ba7c\` (\`sender\`), INDEX \`IDX_30bd60f48d988c824081a4c3bb\` (\`owner\`), INDEX \`IDX_b87d012c41d485467c1997d033\` (\`timestamp\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`collect_events\` (\`id\` int NOT NULL AUTO_INCREMENT, \`poolId\` int NOT NULL, \`owner\` varchar(64) NOT NULL, \`recipient\` varchar(64) NOT NULL, \`tickLower\` int NOT NULL, \`tickUpper\` int NOT NULL, \`amount0\` varchar(39) NOT NULL, \`amount1\` varchar(39) NOT NULL, \`deployHash\` varchar(64) NOT NULL, \`timestamp\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_842a5374279114da9eafefaed3\` (\`poolId\`), INDEX \`IDX_ae0e936fbc009fd51e9fdac358\` (\`owner\`), INDEX \`IDX_cfccfddaeb5b40437079fa47e3\` (\`recipient\`), INDEX \`IDX_dc6ced462c3157bae12dbf2960\` (\`timestamp\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`token_transfers\` (\`id\` int NOT NULL AUTO_INCREMENT, \`tokenAddress\` varchar(64) NOT NULL, \`from\` varchar(64) NULL, \`to\` varchar(64) NOT NULL, \`amount\` varchar(78) NOT NULL, \`deployHash\` varchar(64) NOT NULL, \`timestamp\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_5a347eb20033e061dab369a75f\` (\`tokenAddress\`), INDEX \`IDX_ff578d200294ce72a572d5e266\` (\`from\`), INDEX \`IDX_55161b234bfe2e87d1b1382db5\` (\`to\`), INDEX \`IDX_e4c29e58b1e24afe6a420eac12\` (\`timestamp\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`token_approvals\` (\`id\` int NOT NULL AUTO_INCREMENT, \`tokenAddress\` varchar(64) NOT NULL, \`owner\` varchar(64) NOT NULL, \`spender\` varchar(64) NOT NULL, \`amount\` varchar(78) NOT NULL, \`deployHash\` varchar(64) NOT NULL, \`timestamp\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_67cebffcffc39806494f5380f8\` (\`tokenAddress\`), INDEX \`IDX_e6cb026f9268f89af6775f7520\` (\`owner\`), INDEX \`IDX_49753b167f55bf2c7b89bb854d\` (\`spender\`), INDEX \`IDX_33856c1ad4704b28a55653d37b\` (\`timestamp\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`positions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`tokenId\` bigint NOT NULL, \`poolId\` int NOT NULL, \`owner\` varchar(64) NOT NULL, \`tickLower\` int NOT NULL, \`tickUpper\` int NOT NULL, \`liquidity\` varchar(39) NOT NULL, \`deployHash\` varchar(64) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_a7747fc55f0eae4bc4f91d3b73\` (\`tokenId\`), INDEX \`IDX_5c0fc0b176d41c6ebb12c82e31\` (\`poolId\`), INDEX \`IDX_433905665b17c96b1ed944cc5a\` (\`owner\`), UNIQUE INDEX \`IDX_a7747fc55f0eae4bc4f91d3b73\` (\`tokenId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`liquidity_events\` ADD CONSTRAINT \`FK_851cd175bfdd45bdd03ec1c8070\` FOREIGN KEY (\`poolId\`) REFERENCES \`pools\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`collect_events\` ADD CONSTRAINT \`FK_842a5374279114da9eafefaed3c\` FOREIGN KEY (\`poolId\`) REFERENCES \`pools\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`positions\` ADD CONSTRAINT \`FK_5c0fc0b176d41c6ebb12c82e312\` FOREIGN KEY (\`poolId\`) REFERENCES \`pools\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`positions\` DROP FOREIGN KEY \`FK_5c0fc0b176d41c6ebb12c82e312\``);
        await queryRunner.query(`ALTER TABLE \`collect_events\` DROP FOREIGN KEY \`FK_842a5374279114da9eafefaed3c\``);
        await queryRunner.query(`ALTER TABLE \`liquidity_events\` DROP FOREIGN KEY \`FK_851cd175bfdd45bdd03ec1c8070\``);
        await queryRunner.query(`DROP INDEX \`IDX_a7747fc55f0eae4bc4f91d3b73\` ON \`positions\``);
        await queryRunner.query(`DROP INDEX \`IDX_433905665b17c96b1ed944cc5a\` ON \`positions\``);
        await queryRunner.query(`DROP INDEX \`IDX_5c0fc0b176d41c6ebb12c82e31\` ON \`positions\``);
        await queryRunner.query(`DROP INDEX \`IDX_a7747fc55f0eae4bc4f91d3b73\` ON \`positions\``);
        await queryRunner.query(`DROP TABLE \`positions\``);
        await queryRunner.query(`DROP INDEX \`IDX_33856c1ad4704b28a55653d37b\` ON \`token_approvals\``);
        await queryRunner.query(`DROP INDEX \`IDX_49753b167f55bf2c7b89bb854d\` ON \`token_approvals\``);
        await queryRunner.query(`DROP INDEX \`IDX_e6cb026f9268f89af6775f7520\` ON \`token_approvals\``);
        await queryRunner.query(`DROP INDEX \`IDX_67cebffcffc39806494f5380f8\` ON \`token_approvals\``);
        await queryRunner.query(`DROP TABLE \`token_approvals\``);
        await queryRunner.query(`DROP INDEX \`IDX_e4c29e58b1e24afe6a420eac12\` ON \`token_transfers\``);
        await queryRunner.query(`DROP INDEX \`IDX_55161b234bfe2e87d1b1382db5\` ON \`token_transfers\``);
        await queryRunner.query(`DROP INDEX \`IDX_ff578d200294ce72a572d5e266\` ON \`token_transfers\``);
        await queryRunner.query(`DROP INDEX \`IDX_5a347eb20033e061dab369a75f\` ON \`token_transfers\``);
        await queryRunner.query(`DROP TABLE \`token_transfers\``);
        await queryRunner.query(`DROP INDEX \`IDX_dc6ced462c3157bae12dbf2960\` ON \`collect_events\``);
        await queryRunner.query(`DROP INDEX \`IDX_cfccfddaeb5b40437079fa47e3\` ON \`collect_events\``);
        await queryRunner.query(`DROP INDEX \`IDX_ae0e936fbc009fd51e9fdac358\` ON \`collect_events\``);
        await queryRunner.query(`DROP INDEX \`IDX_842a5374279114da9eafefaed3\` ON \`collect_events\``);
        await queryRunner.query(`DROP TABLE \`collect_events\``);
        await queryRunner.query(`DROP INDEX \`IDX_b87d012c41d485467c1997d033\` ON \`liquidity_events\``);
        await queryRunner.query(`DROP INDEX \`IDX_30bd60f48d988c824081a4c3bb\` ON \`liquidity_events\``);
        await queryRunner.query(`DROP INDEX \`IDX_aade0a56c0221ccc808211ba7c\` ON \`liquidity_events\``);
        await queryRunner.query(`DROP INDEX \`IDX_851cd175bfdd45bdd03ec1c807\` ON \`liquidity_events\``);
        await queryRunner.query(`DROP INDEX \`IDX_6bb7253790e304072e804b2bb2\` ON \`liquidity_events\``);
        await queryRunner.query(`DROP TABLE \`liquidity_events\``);
        await queryRunner.query(`DROP INDEX \`IDX_ff7863a08f35ea3c267672f610\` ON \`pools\``);
        await queryRunner.query(`DROP INDEX \`IDX_5dad2551267245bd27765ffe17\` ON \`pools\``);
        await queryRunner.query(`DROP INDEX \`IDX_4282fef1090e3bd21e10e5a294\` ON \`pools\``);
        await queryRunner.query(`DROP TABLE \`pools\``);
        await queryRunner.query(`DROP INDEX \`IDX_3d00cc3519b513070a18f6d5f9\` ON \`plays\``);
        await queryRunner.query(`DROP TABLE \`plays\``);
    }

}
