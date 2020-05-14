
const utils = require('caver-js/packages/caver-utils')
const Hash = require('eth-lib/lib/hash')

const {
    encodeRLPByTxType,
    makeRawTransaction,
} = require('caver-js/packages/caver-klay/caver-klay-accounts/src/makeRawTransaction')

function coverInitialTxValue (tx) {
    if (typeof tx !== 'object') throw new Error('Invalid transaction')
    if (!tx.senderRawTransaction && (!tx.type || tx.type === 'LEGACY' || tx.type.includes('SMART_CONTRACT_DEPLOY'))) {
        tx.to = tx.to || '0x'
        tx.data = utils.addHexPrefix(tx.data || '0x')
    }
    tx.chainId = utils.numberToHex(tx.chainId)
    return tx
}

function getTransactionResult (tx, v, r, s) {

    const transaction = coverInitialTxValue(tx)

    const rlpEncoded = encodeRLPByTxType(transaction)

    const sigs = []
    sigs.push([v, r, s])

    const { rawTransaction, signatures } = makeRawTransaction(rlpEncoded, sigs, transaction)

    const result = {
        v: sigs[0][0],
        r: sigs[0][1],
        s: sigs[0][2],
        rawTransaction,
        txHash: Hash.keccak256(rawTransaction),
        signatures: signatures,
    }
    return result
}

module.exports = {
    getTransactionResult,
}
