declare module 'bcryptjs' {
  const bcrypt: {
    hash(value: string, rounds: number): Promise<string>
    compare(value: string, hash: string): Promise<boolean>
  }
  export default bcrypt
}

declare module 'sm-crypto' {
  export const sm2: any
  export const sm3: any
  export const sm4: any
}

declare module 'jsrsasign' {
  export const KEYUTIL: any
  export const crypto: any
  export const KJUR: any
  export const hextob64: any
  export const b64tohex: any
}
