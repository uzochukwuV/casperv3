import { MigrationInterface, QueryRunner } from "typeorm";

export class DexEntities1767481740813 implements MigrationInterface {
    name = 'DexEntities1767481740813'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_ff578d200294ce72a572d5e266\` ON \`token_transfers\``);
        await queryRunner.query(`ALTER TABLE \`token_transfers\` DROP COLUMN \`from\``);
        await queryRunner.query(`ALTER TABLE \`token_transfers\` ADD \`from\` varchar(80) NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_55161b234bfe2e87d1b1382db5\` ON \`token_transfers\``);
        await queryRunner.query(`ALTER TABLE \`token_transfers\` DROP COLUMN \`to\``);
        await queryRunner.query(`ALTER TABLE \`token_transfers\` ADD \`to\` varchar(80) NOT NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_e6cb026f9268f89af6775f7520\` ON \`token_approvals\``);
        await queryRunner.query(`ALTER TABLE \`token_approvals\` DROP COLUMN \`owner\``);
        await queryRunner.query(`ALTER TABLE \`token_approvals\` ADD \`owner\` varchar(80) NOT NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_49753b167f55bf2c7b89bb854d\` ON \`token_approvals\``);
        await queryRunner.query(`ALTER TABLE \`token_approvals\` DROP COLUMN \`spender\``);
        await queryRunner.query(`ALTER TABLE \`token_approvals\` ADD \`spender\` varchar(80) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_ff578d200294ce72a572d5e266\` ON \`token_transfers\` (\`from\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_55161b234bfe2e87d1b1382db5\` ON \`token_transfers\` (\`to\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_e6cb026f9268f89af6775f7520\` ON \`token_approvals\` (\`owner\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_49753b167f55bf2c7b89bb854d\` ON \`token_approvals\` (\`spender\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_49753b167f55bf2c7b89bb854d\` ON \`token_approvals\``);
        await queryRunner.query(`DROP INDEX \`IDX_e6cb026f9268f89af6775f7520\` ON \`token_approvals\``);
        await queryRunner.query(`DROP INDEX \`IDX_55161b234bfe2e87d1b1382db5\` ON \`token_transfers\``);
        await queryRunner.query(`DROP INDEX \`IDX_ff578d200294ce72a572d5e266\` ON \`token_transfers\``);
        await queryRunner.query(`ALTER TABLE \`token_approvals\` DROP COLUMN \`spender\``);
        await queryRunner.query(`ALTER TABLE \`token_approvals\` ADD \`spender\` varchar(64) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_49753b167f55bf2c7b89bb854d\` ON \`token_approvals\` (\`spender\`)`);
        await queryRunner.query(`ALTER TABLE \`token_approvals\` DROP COLUMN \`owner\``);
        await queryRunner.query(`ALTER TABLE \`token_approvals\` ADD \`owner\` varchar(64) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_e6cb026f9268f89af6775f7520\` ON \`token_approvals\` (\`owner\`)`);
        await queryRunner.query(`ALTER TABLE \`token_transfers\` DROP COLUMN \`to\``);
        await queryRunner.query(`ALTER TABLE \`token_transfers\` ADD \`to\` varchar(64) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_55161b234bfe2e87d1b1382db5\` ON \`token_transfers\` (\`to\`)`);
        await queryRunner.query(`ALTER TABLE \`token_transfers\` DROP COLUMN \`from\``);
        await queryRunner.query(`ALTER TABLE \`token_transfers\` ADD \`from\` varchar(64) NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_ff578d200294ce72a572d5e266\` ON \`token_transfers\` (\`from\`)`);
    }

}
