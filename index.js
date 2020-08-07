const { EventEmitter } = require('events')
const DcentWebConnector = require('dcent-web-connector')
const keyringType = 'DCENT Hardware'
const DCENT_TIMEOUT = 60000
const klayPathString = `m/44'/8217'/0'/0/0`
const DcentResult = require('./dcent-result')
const CaverUtil = require('./caver-util')

class DcentKeyring extends EventEmitter {
  constructor (opts = {}) {
    super()
    this.type = keyringType
    this.accounts = []
    this.coinType = DcentWebConnector.coinType.KLAYTN
    this.path = klayPathString
    this.deserialize(opts)

    DcentWebConnector.setTimeOutMs(opts.timeOut || DCENT_TIMEOUT)
  }

  serialize () {
    return {
      accounts: this.accounts,
    }
  }

  deserialize (opts = {}) {
    this.accounts = opts.accounts || []
  }

  addAccounts (n = 1) {
    return new Promise((resolve, reject) => {
      this._getAccountsFromDevice()
        .then(address => {
          this.accounts = []
          this.accounts.push(address)

          resolve(this.accounts)
        })
        .catch(e => {
          reject(new Error(e && e.toString() || 'Unknown error'))
        })
    })
  }

  getAccounts () {
    return this.accounts.slice()
  }

  removeAccount (address) {
    if (!this.accounts.map(a => a.toLowerCase()).includes(address.toLowerCase())) {
      throw new Error(`Address ${address} not found in this keyring`)
    }
    this.accounts = this.accounts.filter(a => a.toLowerCase() !== address.toLowerCase())
  }

  // tx is an instance of the ethereumjs-transaction class.
  signTransaction (tx) {
      return new Promise((resolve, reject) => {
        this._signTransaction(tx)
        .then(signedTx => {
          resolve(signedTx)
        }).catch(e => {
          reject(new Error(e && e.toString() || 'Unknown error'))
        })
      })
  }

  feePayerSignTransaction (tx, feePayer) {
    if (!tx.feePayer || tx.feePayer === '0x') {
      tx.feePayer = feePayer
    }
    if (!tx.senderRawTransaction) {
      if (!tx.type || !tx.type.includes('FEE_DELEGATED')) {
          return Promise.reject(new Error(`Failed to sign transaction with fee payer: invalid transaction type(${tx.type ? tx.type : 'LEGACY'})`))
      }
    }

    if (tx.senderRawTransaction) {
      return new Promise((resolve, reject) => {
        this._signTransaction(tx)
        .then(signedTx => {
          resolve(signedTx)
        }).catch(e => {
          reject(new Error(e && e.toString() || 'Unknown error'))
        })
      })
    }

    return Promise.reject(new Error('Not supported on this device'))
  }

  signMessage (withAccount, data) {
    return this.signPersonalMessage(withAccount, data)
  }

  signPersonalMessage (withAccount, message) {
    if (!this.accounts.map(a => a.toLowerCase()).includes(withAccount.toLowerCase())) {
      throw new Error(`Address ${withAccount} not found in this keyring`)
    }

    return new Promise((resolve, reject) => {
      this._signMessage(withAccount, message)
      .then(sign => {
        resolve(sign)
      }).catch(e => {
        reject(new Error(e && e.toString() || 'Unknown error'))
      })
    })
  }

  signTypedData (withAccount, typedData) {
    // Waiting on dcent to enable this
    return Promise.reject(new Error('Not supported on this device'))
  }

  exportAccount (address) {
    return Promise.reject(new Error('Not supported on this device'))
  }

  forgetDevice () {
    this.accounts = []
  }

  /* PRIVATE METHODS */

  _getAccountsFromDevice () {
    return new Promise((resolve, reject) => {
      // TODO: [For multi accounts] get account info from device and retrieve accounts using coinType
      // Get Address using coinType and path
      DcentWebConnector.getAddress(
        this.coinType,
        this.path,
      ).then(response => {
        if (response.header.status === DcentResult.SUCCESS) {
          resolve(response.body.parameter.address) // return address of first account
        } else {
          if (response.body.error) {
            reject(response.body.error.code + ' - ' + response.body.error.message)
          } else {
            reject('Unknown error - ' + response)
          }
        }
        DcentWebConnector.popupWindowClose()
      }).catch(e => {
        if (e.body.error) {
          reject(e.body.error.code + ' - ' + e.body.error.message)
        } else {
          reject('Unknown error - ' + e)
        }
        DcentWebConnector.popupWindowClose()
      })
   })
  }

  //
  _signMessage (withAccount, message) {
    return new Promise((resolve, reject) => {
      DcentWebConnector.getSignedMessage(
        this.coinType,
        this.path,
        message,
      ).then((response) => {
        if (response.header.status === DcentResult.SUCCESS) {
          const address = response.body.parameter.address
          if (withAccount.toLowerCase() !== address.toLowerCase()) {
            reject(`Address ${withAccount} not found in this Device`)
          }
          const sign = response.body.parameter.sign
          // /////////
          resolve(sign)
        } else {
          if (response.body.error) {
            reject(response.body.error.code + ' - ' + response.body.error.message)
          } else {
            reject('Unknown error - ' + response)
          }
        }
        DcentWebConnector.popupWindowClose()
      }).catch(e => {
        if (e.body.error) {
          reject(e.body.error.code + ' - ' + e.body.error.message)
        } else {
          reject('Unknown error - ' + e)
        }
        DcentWebConnector.popupWindowClose()
      })
    })
  }
  //
  _signTransaction (tx) {
    const txObj = CaverUtil.generateTxObject(tx)
    const txType = txObj.ref.isFeePayer ? DcentWebConnector.klaytnTxType.FEE_PAYER : this._getKlaytnTxType(txObj.type)
    return new Promise((resolve, reject) => {
        DcentWebConnector.getKlaytnSignedTransaction(
        this.coinType,
        txObj.nonce,
        txObj.gasPrice,
        txObj.gas,
        txObj.to,
        txObj.value,
        txObj.data,
        this.path, // key path
        txObj.chainId,
        txType, // klaytn tx type
        txObj.from, // from
        txObj.feeRatio,
        txObj.contract,
      ).then((response) => {
        if (response.header.status === DcentResult.SUCCESS) {
          const sigs = txObj.ref.isFeePayer ? txObj.ref.existedFeePayerSignatures : txObj.ref.existedSenderSignatures
          sigs.push([response.body.parameter.sign_v, response.body.parameter.sign_r, response.body.parameter.sign_s])
          const result = CaverUtil.getTransactionResult(txObj.ref.isFeePayer, txObj.ref.transaction, txObj.ref.rlpEncoded, sigs)
          // /////////
          resolve(result)
        } else {
          if (response.body.error) {
            reject(response.body.error.code + ' - ' + response.body.error.message)
          } else {
            reject('Unknown error - ' + response)
          }
        }
        setTimeout(() => {
          DcentWebConnector.popupWindowClose()
        }, 100)
      }).catch(e => {
        if (e.body.error) {
          reject(e.body.error.code + ' - ' + e.body.error.message)
        } else {
          reject('Unknown error - ' + e)
        }
        setTimeout(() => {
          DcentWebConnector.popupWindowClose()
        }, 100)
      })
    })

  }

  _getKlaytnTxType (txType) {
    if (txType === undefined) {
      return DcentWebConnector.klaytnTxType.LEGACY
    }
    switch (txType) {
      case 'LEGACY':
        return DcentWebConnector.klaytnTxType.LEGACY
      case 'FEE_PAYER':
        return DcentWebConnector.klaytnTxType.FEE_PAYER
      case 'VALUE_TRANSFER':
        return DcentWebConnector.klaytnTxType.VALUE_TRANSFER
      case 'FEE_DELEGATED_VALUE_TRANSFER':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_VALUE_TRANSFER
      case 'FEE_DELEGATED_VALUE_TRANSFER_WITH_RATIO':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_VALUE_TRANSFER_WITH_RATIO
      case 'VALUE_TRANSFER_MEMO':
        return DcentWebConnector.klaytnTxType.VALUE_TRANSFER_MEMO
      case 'FEE_DELEGATED_VALUE_TRANSFER_MEMO':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_VALUE_TRANSFER_MEMO
      case 'FEE_DELEGATED_VALUE_TRANSFER_MEMO_WITH_RATIO':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_VALUE_TRANSFER_MEMO_WITH_RATIO
      case 'SMART_CONTRACT_EXECUTION':
        return DcentWebConnector.klaytnTxType.SMART_CONTRACT_EXECUTION
      case 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_SMART_CONTRACT_EXECUTION
      case 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION_WITH_RATIO':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_SMART_CONTRACT_EXECUTION_WITH_RATIO
      case 'CANCEL':
        return DcentWebConnector.klaytnTxType.CANCEL
      case 'FEE_DELEGATED_CANCEL':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_CANCEL
      case 'FEE_DELEGATED_CANCEL_WITH_RATIO':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_CANCEL_WITH_RATIO
      case 'SMART_CONTRACT_DEPLOY':
        return DcentWebConnector.klaytnTxType.SMART_CONTRACT_DEPLOY
      case 'FEE_DELEGATED_SMART_CONTRACT_DEPLOY':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_SMART_CONTRACT_DEPLOY
      case 'FEE_DELEGATED_SMART_CONTRACT_DEPLOY_WITH_RATIO':
        return DcentWebConnector.klaytnTxType.FEE_DELEGATED_SMART_CONTRACT_DEPLOY_WITH_RATIO
      default :
        throw new Error('This device is not support the tx type - ' + txType)
    }
  }

}

DcentKeyring.type = keyringType
module.exports = DcentKeyring
