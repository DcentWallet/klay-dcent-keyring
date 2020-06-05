global.window = require('./window.shim')
global.navigator = require('./navigator.shim')
global.self = require('./self.shim')

const chai = require('chai')
const spies = require('chai-spies')
const {expect} = chai
const assert = require('assert')
const DcentWebConnector = require('dcent-web-connector')

const DcentKeyring = require('../')
const fakeAddress = '0xF30952A1c534CDE7bC471380065726fa8686dfB3'
const fakeTx = {
    nonce: '0x03',
    gasPrice: '0x09184e72a000',
    gas: '0x2710',
    to: '0x0000000000000000000000000000000000000000',
    value: '0x00',
    data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
    chainId: 1001,
    from: '0xF30952A1c534CDE7bC471380065726fa8686dfB3',
}
const feePayerAddress = '0xae61ba3f5f43c9d4943b09a3733edb572f7bf161'
const fakeFeePayerTx = {
    senderRawTransaction: '0x09f8878000832dc6c094ae61ba3f5f43c9d4943b09a3733edb572f7bf161872386f26fc1000094ae61ba3f5f43c9d4943b09a3733edb572f7bf161f847f8458207f6a0dd6bb2403631f05861efbb291e8c1974db90e617a930227d29a2b005ec897693a057ba0469ac6f8c49ac2df16b17857fd936d18754645dea3063a0c32d445eec5380c4c3018080',
	feePayer: '0xae61ba3f5f43c9d4943b09a3733edb572f7bf161',
	gasPrice: '0x5d21dba00',
	chainId: 1001,
}

chai.use(spies)

describe('DcentKeyring', function () {

    let keyring

    beforeEach(async function () {
        keyring = new DcentKeyring({ timeOut: 2000 })
    })

    describe('Keyring.type', function () {
        it('is a class property that returns the type string.', function () {
            const type = DcentKeyring.type
            assert.equal(typeof type, 'string')
        })

        it('returns the correct value', function () {
            const type = keyring.type
            const correct = DcentKeyring.type
            assert.equal(type, correct)
        })
    })

    describe('constructor', function () {
        it('constructs', function (done) {
            const t = new DcentKeyring({ accounts: [fakeAddress] })
            assert.equal(typeof t, 'object')
            const accounts = t.getAccounts()

            assert.equal(Array.isArray(accounts), true)
            done()
        })
    })

    describe('serialize', function () {
        it('serializes an instance', function (done) {
            const output = keyring.serialize()

            assert.equal(Array.isArray(output.accounts), true)
            assert.equal(output.accounts.length, 0)
            done()
          })
    })

    describe('deserialize', function () {
        it('serializes what it deserializes', function (done) {

            keyring.deserialize({
                accounts: [],
            })
            const serialized = keyring.serialize()
            assert.equal(serialized.accounts.length, 0, 'restores 0 accounts')
            done()
        })
    })

    describe('addAccounts', function () {
        describe('with no arguments', function () {

          it('should call DcentWebConnector.getAddress', async function () {

            chai.spy.on(DcentWebConnector, 'getAddress')

            try {
              await keyring.addAccounts()
            } catch (e) {
              // because we're trying to open the popup in node
              // it will throw an exception
            } finally {
              expect(DcentWebConnector.getAddress).to.have.been.called()
            }
          })
        })
    })

    describe('removeAccount', function () {
        describe('if the account exists', function () {
            it('should remove that account', function (done) {
                keyring.deserialize({ accounts: [fakeAddress] })
                const accounts = keyring.getAccounts()
                assert.equal(accounts.length, 1)
                keyring.removeAccount(fakeAddress)
                const accountsAfterRemoval = keyring.getAccounts()
                assert.equal(accountsAfterRemoval.length, 0)
                done()
            })
        })

        describe('if the account does not exist', function () {
            it('should throw an error', function () {
                const unexistingAccount = '0x0000000000000000000000000000000000000000'
                expect(_ => {
                   keyring.removeAccount(unexistingAccount)
                }).to.throw(`Address ${unexistingAccount} not found in this keyring`)
            })
        })
    })

    describe('getAccounts', async function () {
        let accounts = []
        beforeEach(async function () {
            keyring.deserialize({
              accounts: [fakeAddress],
            })
            accounts = keyring.getAccounts()
        })

        it('returns an array of accounts', function () {
            assert.equal(Array.isArray(accounts), true)
            assert.equal(accounts.length, 1)
        })

        it('returns the expected', function () {
            const expectedAccount = fakeAddress
            assert.equal(accounts[0], expectedAccount)
        })
    })

    describe('signTransaction', async function () {
        it('should call DcentWebConnector.getKlaytnSignedTransaction', function (done) {

            chai.spy.on(DcentWebConnector, 'getKlaytnSignedTransaction')

            keyring.signTransaction(fakeTx).catch(e => {
            //     // we expect this to be rejected because
            //     // we are trying to open a popup from node
                 expect(DcentWebConnector.getKlaytnSignedTransaction).to.have.been.called()
                 done()
            })
            // done()
        })
    })

    describe('feePayerSignTransaction', async function () {
        it('should call DcentWebConnector.getKlaytnSignedTransaction', function (done) {

           // chai.spy.on(DcentWebConnector, 'getKlaytnSignedTransaction')

            keyring.feePayerSignTransaction(fakeFeePayerTx, feePayerAddress).catch(e => {
            //     // we expect this to be rejected because
            //     // we are trying to open a popup from node
                 expect(DcentWebConnector.getKlaytnSignedTransaction).to.have.been.called()
                 done()
            })
            // done()
        })
    })

    describe('signMessage, signPersonalMessage', async function () {
        beforeEach(async function () {
            keyring.deserialize({
              accounts: [fakeAddress],
            })
        })

        it('signMessage : should call DcentWebConnector.getSignedMessage', function (done) {

          chai.spy.on(DcentWebConnector, 'getSignedMessage')
          const message = '0xaabbccddeeffaabbccddeeff'
          keyring.signMessage(fakeAddress, message).catch(e => {
            //     // we expect this to be rejected because
            //     // we are trying to open a popup from node
                 expect(DcentWebConnector.getSignedMessage).to.have.been.called()
                 done()
            })
        })

        it('signPersonalMessage : should call DcentWebConnector.getSignedMessage', function (done) {

            const message = 'This is a message!!'
            keyring.signMessage(fakeAddress, message).catch(e => {
              //     // we expect this to be rejected because
              //     // we are trying to open a popup from node
                   expect(DcentWebConnector.getSignedMessage).to.have.been.called()
                   done()
              })
          })
    })

    describe('signTypedData', function () {
        it('should throw an error because it is not supported', async function () {
            let error = null
            try {
                await keyring.signTypedData()
            } catch (e) {
                error = e
            }

            expect(error instanceof Error, true)
            expect(error.toString(), 'Not supported on this device')
        })
    })

    describe('exportAccount', function () {
        it('should throw an error because it is not supported', async function () {
            let error = null
            try {
                await keyring.exportAccount()
            } catch (e) {
                error = e
            }

            expect(error instanceof Error, true)
            expect(error.toString(), 'Not supported on this device')
        })
    })

    describe('forgetDevice', function () {
        it('should clear the content of the keyring', async function () {
            // Add an account
            keyring.deserialize({ accounts: [fakeAddress] })
            let accounts = keyring.getAccounts()
            assert.equal(accounts.length, 1)

            // Wipe the keyring
            keyring.forgetDevice()

            accounts = keyring.getAccounts()

            assert.equal(accounts.length, 0)
        })
    })

})
