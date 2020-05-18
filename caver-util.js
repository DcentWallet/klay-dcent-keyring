const utils = require('caver-js/packages/caver-utils')
const Hash = require('eth-lib/lib/hash')

const {
    encodeRLPByTxType,
    makeRawTransaction,
    getSenderTxHash,
    splitFeePayer,
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

    console.log('tx - ', tx)
    const transaction = coverInitialTxValue(tx)
    const rlpEncoded = encodeRLPByTxType(transaction)

    const txObj = tx
    const decoded = decodeRawTransaction(tx)
    console.log('tx - ', tx)
    console.log('decoded - ', tx)
    txObj.nonce = tx.nonce || decoded.nonce
    console.log('txObj.nonce - ', txObj.nonce)
    txObj.nonce = (txObj.nonce === '0x') ? '0x0' : txObj.nonce
    txObj.gasPrice = tx.gasPrice || decoded.gasPrice || '0x00'
    txObj.gas = tx.gas || decoded.gas || '0x00'
    txObj.to = tx.to || decoded.to
    txObj.value = tx.value || decoded.value || '0x00'
    txObj.from = tx.from || decoded.from
    txObj.data = tx.data || decoded.data || '0x'
    txObj.feeRatio = tx.feeRatio || decoded.feeRatio || null
    txObj.contract = tx.contract || null
    txObj.chainId = utils.hexToNumber(tx.chainId)
    //
    console.log('txObj - ', txObj)
    txObj.ref = { isFeePayer, transaction, rlpEncoded, existedFeePayerSignatures, existedSenderSignatures }
    return txObj
}

//
function getTransactionResult (isFeePayer, transaction, rlpEncoded, sigs) {

    const { rawTransaction, signatures, feePayerSignatures } = makeRawTransaction(rlpEncoded, sigs, transaction)

    const result = {
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
