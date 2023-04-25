let mock: typeof performWithdrawal | false

export const mockWithdrawal = (mockFn: typeof performWithdrawal | false) => { mock = mockFn }

export const performWithdrawal = async (id: number, amount: number) => {
  if (mock) {
    return mock(id, amount)
  }
  // let's pretend something happens here
}