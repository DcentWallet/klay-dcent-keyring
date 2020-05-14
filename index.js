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
        this._klaytnSignTransaction(tx)
        .then(signedTx => {
          resolve(signedTx)
        }).catch(e => {
          reject(new Error(e && e.toString() || 'Unknown error'))
        })
      })
  }

  signMessage (withAccount, data) {
    return this.signPersonalMessage(withAccount, data)
  }

  signPersonalMessage (withAccount, message) {
    // Waiting on dcent to enable this
    return Promise.reject(new Error('Not supported on this device'))
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
        this.path
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

  _klaytnSignTransaction (tx) {
      const txType = this._getKlaytnTxType(tx.type)
      const contract = tx.contract || null

      tx.feeRatio = tx.feeRatio || null
      tx.data = tx.data || '0x'
      return new Promise((resolve, reject) => {
        DcentWebConnector.getKlaytnSignedTransaction(
        this.coinType,
        tx.nonce,
        tx.gasPrice,
        tx.gas,
        tx.to,
        tx.value,
        tx.data,
        this.path, // key path
        tx.chainId,
        txType, // klaytn tx type
        tx.from, // from
        tx.feeRatio,
        contract
      ).then((response) => {
        if (response.header.status === DcentResult.SUCCESS) {

          const result = CaverUtil.getTransactionResult(tx, response.body.parameter.sign_v, response.body.parameter.sign_r, response.body.parameter.sign_s)
          // /////////
          resolve(result)
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

  _getKlaytnTxType (txType) {
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
    }
  }

}

DcentKeyring.type = keyringType
module.exports = DcentKeyring
