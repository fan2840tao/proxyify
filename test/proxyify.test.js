
const ERROR1 = new Error('throw getAccountsError')
const target = {
  eth: {
    async getAccountsAsync () {
      return [1, 2, 3, 4]
    },
    getAccounts () {
      return ['getAccounts', 'result']
    },
    Contract: class {
      constructor () {
        this.methods = {
          balanceOf (account) {
            return {
              async call () {
                return account
              },
              async send () {
                throw account.repeat(2)
              }
            }
          }
        }
      }
    },
    getAccountsError () {
      throw ERROR1
    },
    version: 10
  },
  version: 10
}

const proxyify = require('../proxyify')

test('main', async () => {
  const mockCallback = jest.fn()
  let newTarget = proxyify(target, mockCallback, ['web3'])
  //   (arg) => {
  //   console.log('——————', JSON.stringify(arg))
  //   expect().toMatchObject
  // }
  newTarget.version.toString()
  expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'get', 'args': null, 'paths': ['web3', 'version'], 'error': null, 'result': 10})
  newTarget.eth.version.toString()
  expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'get', 'args': null, 'paths': ['web3', 'eth', 'version'], 'error': null, 'result': 10})

  newTarget.version = 'new version'
  expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'set', 'args': 'new version', 'paths': ['web3', 'version'], 'error': null, 'result': true})

  await newTarget.eth.getAccountsAsync('0x111')
  expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'apply', 'args': ['0x111'], 'paths': ['web3', 'eth', 'getAccountsAsync'], 'error': null, 'result': [1, 2, 3, 4]})

  newTarget.eth.getAccounts('0x222')
  expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'apply', 'args': ['0x222'], 'paths': ['web3', 'eth', 'getAccounts'], 'error': null, 'result': ['getAccounts', 'result']})

  try {
    newTarget.eth.getAccountsError('gae')
  } catch (ex) {
    expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'apply', 'args': ['gae'], 'paths': ['web3', 'eth', 'getAccountsError'], 'error': ERROR1})
    expect(ex).toBe(ERROR1)
  }

  let contract = new newTarget.eth.Contract(1, 2)
  expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'construct', 'args': [1, 2], 'paths': ['web3', 'eth', 'Contract'], 'error': null})
  await contract.methods.balanceOf('xxx').call()
  expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'apply', 'args': [], 'paths': ['web3', 'eth', 'Contract', 'methods', 'balanceOf', 'call'], 'error': null, 'result': 'xxx'})
  expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'apply', 'args': ['xxx'], 'paths': ['web3', 'eth', 'Contract', 'methods', 'balanceOf'], 'error': null})
  try {
    await contract.methods.balanceOf('yy').send()
    expect(true).toBe(false)
  } catch (ex) {
    expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'apply', 'args': [], 'paths': ['web3', 'eth', 'Contract', 'methods', 'balanceOf', 'send'], 'error': 'yyyy'})
    expect(mockCallback.mock.calls.pop()[0]).toMatchObject({'type': 'apply', 'args': ['yy'], 'paths': ['web3', 'eth', 'Contract', 'methods', 'balanceOf'], 'error': null})
    expect(ex).toEqual('yyyy')
  }
})
