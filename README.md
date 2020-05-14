# klay-dcent-keyring
A JavaScript wrapper around dcent-web-connector libraries, to support the KeyringController used by Kaikas

It works in the same way as keyring of Kaikas, but using a D'CENT biometric device. However there are a number of differences:

- Because the keys are stored in the device, operations that rely on the device will fail if there is no D'CENT biometric device attached, or a different D'CENT biometric device is attached. ( Perchase: https://dcentwallet.com/Shop )
- It does not support the `signMessage`, `signPersonalMessage`, `signTypedData` or `exportAccount` methods, because D'CENT biometric devices do not support these operations.
- It works the firmware version 1.5.1+ for D'CENT Biometric device

## Test 
Run the following command:
```
npm run test
```
