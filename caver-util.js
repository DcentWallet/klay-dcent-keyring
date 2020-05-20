const utils = require('caver-js/packages/caver-utils')

const helpers = require('caver-js/packages/caver-core-helpers')
const Hash = require('eth-lib/lib/hash')
const RLP = require('eth-lib/lib/rlp')
const Bytes = require('eth-lib/lib/bytes')

const {
    FEE_DELEGATED_VALUE_TRANSFER_TYPE_TAG,
    FEE_DELEGATED_VALUE_TRANSFER_MEMO_TYPE_TAG,
    FEE_DELEGATED_VALUE_TRANSFER_MEMO_WITH_RATIO_TYPE_TAG,
    FEE_DELEGATED_VALUE_TRANSFER_WITH_RATIO_TYPE_TAG,

    FEE_DELEGATED_SMART_CONTRACT_EXECUTION_TYPE_TAG,
    FEE_DELEGATED_SMART_CONTRACT_EXECUTION_WITH_RATIO_TYPE_TAG,

    FEE_DELEGATED_CANCEL_TYPE_TAG, 
    FEE_DELEGATED_CANCEL_WITH_RATIO_TYPE_TAG,
} = helpers.constants

const {
    encodeRLPByTxType,
    makeRawTransaction,
    getSenderTxHash,
    splitFeePayer,
} = require('caver-js/packages/caver-klay/caver-klay-accounts/src/makeRawTransaction')

function inputCallFormatter (tx) {
    return helpers.formatters.inputCallFormatter(tx)
}

function coverInitialTxValue (tx) {
    if (typeof tx !== 'object') throw new Error('Invalid transaction')
    if (!tx.senderRawTransaction && (!tx.type || tx.type === 'LEGACY' || tx.type.includes('SMART_CONTRACT_DEPLOY'))) {
        tx.to = tx.to || '0x'
        tx.data = utils.addHexPrefix(tx.data || '0x')
    }
    tx.chainId = utils.numberToHex(tx.chainId)
    return tx
}

function decodeRawTransaction (transaction) {
    if (!transaction.senderRawTransaction) {
        return {}
    }
    // fee payer rlp encoding.
    const typeDetacehdRawTransaction = `0x${transaction.senderRawTransaction.slice(4)}`

    if (transaction.type === 'FEE_DELEGATED_VALUE_TRANSFER') {
        // eslint-disable-next-line no-unused-vars
        const [nonce, gasPrice, gas, to, value, from, [[v, r, s]]] = utils.rlpDecode(typeDetacehdRawTransaction)
        return { nonce, gasPrice, gas, to, value, from }
    } else if (transaction.type === 'FEE_DELEGATED_VALUE_TRANSFER_WITH_RATIO') {
        // eslint-disable-next-line no-unused-vars
        const [nonce, gasPrice, gas, to, value, from, feeRatio, [[v, r, s]]] = utils.rlpDecode(typeDetacehdRawTransaction)
        return { nonce, gasPrice, gas, to, value, from, feeRatio }
    } else if (transaction.type === 'FEE_DELEGATED_VALUE_TRANSFER_MEMO') {
        // eslint-disable-next-line no-unused-vars
        const [nonce, gasPrice, gas, to, value, from, data, [[v, r, s]]] = utils.rlpDecode(typeDetacehdRawTransaction)
        return { nonce, gasPrice, gas, to, value, from, data }
    } else if (transaction.type === 'FEE_DELEGATED_VALUE_TRANSFER_MEMO_WITH_RATIO') {
        // eslint-disable-next-line no-unused-vars
        const [nonce, gasPrice, gas, to, value, from, data, feeRatio, [[v, r, s]]] = utils.rlpDecode(typeDetacehdRawTransaction)
        return { nonce, gasPrice, gas, to, value, from, data, feeRatio }
    } else if (transaction.type === 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION') {
        // eslint-disable-next-line no-unused-vars
        const [nonce, gasPrice, gas, to, value, from, data, [[v, r, s]]] = utils.rlpDecode(typeDetacehdRawTransaction)
        return { nonce, gasPrice, gas, to, value, from, data }
    } else if (transaction.type === 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION_WITH_RATIO') {
        // eslint-disable-next-line no-unused-vars
        const [nonce, gasPrice, gas, to, value, from, data, feeRatio, [[v, r, s]]] = utils.rlpDecode(typeDetacehdRawTransaction)
        return { nonce, gasPrice, gas, to, value, from, data, feeRatio }
    } else if (transaction.type === 'CANCEL') {

    } else if (transaction.type === 'FEE_DELEGATED_CANCEL') {
        // eslint-disable-next-line no-unused-vars
        const [nonce, gasPrice, gas, from, [[v, r, s]]] = utils.rlpDecode(typeDetacehdRawTransaction)
        return { nonce, gasPrice, gas, from }
    } else if (transaction.type === 'FEE_DELEGATED_CANCEL_WITH_RATIO') {
        // eslint-disable-next-line no-unused-vars
        const [nonce, gasPrice, gas, from, feeRatio, [[v, r, s]]] = utils.rlpDecode(typeDetacehdRawTransaction)
        return { nonce, gasPrice, gas, from, feeRatio }
    } else {
        return {}
    }
}


function getRlpData (type, values) {

    switch (type) {
         case 'FEE_DELEGATED_VALUE_TRANSFER':
            return RLP.encode([
                FEE_DELEGATED_VALUE_TRANSFER_TYPE_TAG,
                Bytes.fromNat(values.nonce),
                Bytes.fromNat(values.gasPrice),
                Bytes.fromNat(values.gas),
                values.to.toLowerCase(),
                Bytes.fromNat(values.value),
                values.from.toLowerCase(),
            ])
        case 'FEE_DELEGATED_VALUE_TRANSFER_WITH_RATIO':
            return RLP.encode([
                    FEE_DELEGATED_VALUE_TRANSFER_WITH_RATIO_TYPE_TAG,
                    Bytes.fromNat(values.nonce),
                    Bytes.fromNat(values.gasPrice),
                    Bytes.fromNat(values.gas),
                    values.to.toLowerCase(),
                    Bytes.fromNat(values.value),
                    values.from.toLowerCase(),
                    values.feeRatio,
                ])
        case 'FEE_DELEGATED_VALUE_TRANSFER_MEMO':
            return RLP.encode([
                    FEE_DELEGATED_VALUE_TRANSFER_MEMO_TYPE_TAG,
                    Bytes.fromNat(values.nonce),
                    Bytes.fromNat(values.gasPrice),
                    Bytes.fromNat(values.gas),
                    values.to.toLowerCase(),
                    Bytes.fromNat(values.value),
                    values.from.toLowerCase(),
                    values.data,
                ])
        case 'FEE_DELEGATED_VALUE_TRANSFER_MEMO_WITH_RATIO':
            return RLP.encode([
                FEE_DELEGATED_VALUE_TRANSFER_MEMO_WITH_RATIO_TYPE_TAG,
                Bytes.fromNat(values.nonce),
                Bytes.fromNat(values.gasPrice),
                Bytes.fromNat(values.gas),
                values.to.toLowerCase(),
                Bytes.fromNat(values.value),
                values.from.toLowerCase(),
                values.data,
                Bytes.fromNat(values.feeRatio),
            ])              
        case 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION':
            return RLP.encode([
                FEE_DELEGATED_SMART_CONTRACT_EXECUTION_TYPE_TAG,
                Bytes.fromNat(values.nonce),
                Bytes.fromNat(values.gasPrice),
                Bytes.fromNat(values.gas),
                values.to.toLowerCase(),
                Bytes.fromNat(values.value),
                values.from.toLowerCase(),
                values.data,
            ])  
        case 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION_WITH_RATIO':
            return RLP.encode([
                FEE_DELEGATED_SMART_CONTRACT_EXECUTION_WITH_RATIO_TYPE_TAG,
                Bytes.fromNat(values.nonce),
                Bytes.fromNat(values.gasPrice),
                Bytes.fromNat(values.gas),
                values.to.toLowerCase(),
                Bytes.fromNat(values.value),
                values.from.toLowerCase(),
                values.data,
                Bytes.fromNat(values.feeRatio),
            ])  
        case 'FEE_DELEGATED_CANCEL' :
            return RLP.encode([
                FEE_DELEGATED_CANCEL_TYPE_TAG,
                Bytes.fromNat(values.nonce),
                Bytes.fromNat(values.gasPrice),
                Bytes.fromNat(values.gas),
                values.from.toLowerCase(),
            ])
        case 'FEE_DELEGATED_CANCEL_WITH_RATIO':
            return RLP.encode([
                FEE_DELEGATED_CANCEL_WITH_RATIO_TYPE_TAG,
                Bytes.fromNat(values.nonce),
                Bytes.fromNat(values.gasPrice),
                Bytes.fromNat(values.gas),
                values.from.toLowerCase(),
                Bytes.fromNat(values.feeRatio),
            ])     
        default:
            return {}
    }
}

function generateTxObject (tx) {
    let isLegacy = false
    let isFeePayer = false
    let existedFeePayerSignatures = []
    let existedSenderSignatures = []

    if (tx.senderRawTransaction) {
        if (tx.feePayerSignatures) {
            existedFeePayerSignatures = existedFeePayerSignatures.concat(tx.feePayerSignatures)
        }
        try {
            // Decode senderRawTransaction to get signatures of fee payer
            const { senderRawTransaction, feePayer, feePayerSignatures } = splitFeePayer(tx.senderRawTransaction)
            // feePayer !== '0x' means that in senderRawTransaction there are feePayerSignatures
            if (feePayer !== '0x') {
                // The feePayer inside the tx object does not match the feePayer information contained in the senderRawTransaction.
                if (feePayer.toLowerCase() !== tx.feePayer.toLowerCase()) {
                  return Promise.reject(`Invalid feePayer: The fee payer(${feePayer}) included in the transaction does not match the fee payer(${tx.feePayer}) you want to sign.`)
                }
                existedFeePayerSignatures = existedFeePayerSignatures.concat(feePayerSignatures)
            }

            tx.senderRawTransaction = senderRawTransaction
            isFeePayer = true

        } catch (e) {
          return Promise.reject(e.message || e)
        }
    } else {
      isLegacy = !!(tx.type === undefined || tx.type === 'LEGACY')
      if (tx.signatures) {
          // if there is existed signatures or feePayerSignatures, those should be preserved.
          if (isLegacy) {
            return Promise.reject('Legacy transaction cannot be signed with multiple keys.')
          }
          existedSenderSignatures = existedSenderSignatures.concat(tx.signatures)
      }
    }
    
    tx = inputCallFormatter(tx)
    const transaction = coverInitialTxValue(tx)
    const rlpEncoded = encodeRLPByTxType(transaction)
    const txObj = Object.assign({}, tx)
    const decoded = decodeRawTransaction(tx)
    let rlpData
    if (isFeePayer) {
        rlpData = getRlpData(tx.type, decoded)
    } else {
        rlpData = tx.data
    }
    txObj.nonce = tx.nonce || '0'
    txObj.nonce = (txObj.nonce === '0x') ? '0x0' : txObj.nonce
    txObj.gasPrice = tx.gasPrice || decoded.gasPrice || '0x00'
    txObj.gas = tx.gas || decoded.gas || '0x00'
    txObj.to = tx.to || ''
    txObj.value = tx.value || '0x00'
    txObj.from = isFeePayer ? tx.feePayer : tx.from
    txObj.data = rlpData || '0x'
    txObj.feeRatio = utils.hexToNumber(tx.feeRatio) || utils.hexToNumber(decoded.feeRatio) || null
    txObj.contract = tx.contract || null
    txObj.chainId = utils.hexToNumber(tx.chainId)
    //
    txObj.ref = { isFeePayer, transaction, rlpEncoded, existedFeePayerSignatures, existedSenderSignatures }
    return txObj
}

//
function getTransactionResult (isFeePayer, transaction, rlpEncoded, sigs) {

    const { rawTransaction, signatures, feePayerSignatures } = makeRawTransaction(rlpEncoded, sigs, transaction)
    const result = {
        // messageHash: Hash.keccak256(rlpEncoded),
        v: sigs[0][0],
        r: sigs[0][1],
        s: sigs[0][2],
        rawTransaction,
        txHash: Hash.keccak256(rawTransaction),
        senderTxHash: getSenderTxHash(rawTransaction),       
    }

    if (isFeePayer) {
        result.feePayerSignatures = feePayerSignatures
    } else {
        result.signatures = signatures
    }
    return result
}

module.exports = {
    getTransactionResult,
    generateTxObject,
}
