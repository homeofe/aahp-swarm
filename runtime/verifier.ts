export interface VerifyResult {
  role: string
  status: 'pass' | 'warning' | 'fail'
  notes: string[]
}

export async function runVerify(_input: unknown): Promise<VerifyResult> {
  return {
    role: 'verifier',
    status: 'pass',
    notes: ['verifier placeholder'],
  }
}
