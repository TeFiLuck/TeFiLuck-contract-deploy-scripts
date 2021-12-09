require('dotenv').config();
import { LCDClient, MsgStoreCode, MsgExecuteContract, MsgInstantiateContract, MnemonicKey, isTxError } from '@terra-money/terra.js';
import * as fs from 'fs';

const mk = new MnemonicKey({
    mnemonic: process.env.MNEMONIC
});

const terra = new LCDClient({
    URL: process.env.LCD,
    chainID: process.env.CHAINID
});

const wallet = terra.wallet(mk);

// store wasm
const storeCode = new MsgStoreCode(
    wallet.key.accAddress,
    fs.readFileSync('./artifacts/p2pcoinflip.wasm').toString('base64')
);

const storeCodeTx = await wallet.createAndSignTx({
    msgs: [storeCode],
});
const storeCodeTxResult = await terra.tx.broadcast(storeCodeTx);

if (isTxError(storeCodeTxResult)) {
    throw new Error(
        `store code failed. code: ${storeCodeTxResult.code}, codespace: ${storeCodeTxResult.codespace}, raw_log: ${storeCodeTxResult.raw_log}`
    );
}

const {
    store_code: { code_id },
} = storeCodeTxResult.logs[0].eventsByType;

console.log("store code success");
await new Promise(resolve => setTimeout(resolve, 5000));

// instantiate contract
const instantiate = new MsgInstantiateContract(
    wallet.key.accAddress,
    "",
    +code_id[0],
    {
        treasury: "terra1md74d45hffytk0xwyf7slgcd8tjqarfwvstm50",
        treasury_tax_percent: 1,
        max_bets_by_addr: 50,
        min_bet_amounts: [
            {denom: "uluna", min_amount: 1000},
            { denom :"uusd", min_amount: 100000}
        ],
        min_blocks_until_liquidation: 1,
        max_blocks_until_liquidation: 5,
        bet_responder_liquidation_percent: 90,
        bet_liquidator_percent: 7,
        treasury_liquidation_percent: 3,
        historical_bets_max_storage_size: 10,
        historical_bets_clear_batch_size: 5,
        blocks_for_responder_liquidation: 5
    },
    {}
);

const instantiateTx = await wallet.createAndSignTx({
    msgs: [instantiate],
});
const instantiateTxResult = await terra.tx.broadcast(instantiateTx);

if (isTxError(instantiateTxResult)) {
    throw new Error(
        `instantiate failed. code: ${instantiateTxResult.code}, codespace: ${instantiateTxResult.codespace}, raw_log: ${instantiateTxResult.raw_log}`
    );
}

const {
    instantiate_contract: { contract_address },
} = instantiateTxResult.logs[0].eventsByType;

const contract_addr = contract_address[0];
console.log(`instantiate success, contract address:\n${contract_addr}`);