import CryptoJS from 'crypto-js'

export const base64 = {
  encode: (str: string): string => btoa(encodeURIComponent(str)),
  decode: (str: string): string => decodeURIComponent(atob(str))
}

export const urlSafeBase64 = {
  encode: (str: string): string => {
    return btoa(encodeURIComponent(str))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  },
  decode: (str: string): string => {
    str = str.replace(/-/g, '+').replace(/_/g, '/')
    while (str.length % 4) str += '='
    return decodeURIComponent(atob(str))
  }
}

export const md5 = (str: string): string => {
  return CryptoJS.MD5(str).toString()
}

export const aes = {
  encrypt: (str: string, key: string): string => {
    return CryptoJS.AES.encrypt(str, key).toString()
  },
  decrypt: (str: string, key: string): string => {
    const bytes = CryptoJS.AES.decrypt(str, key)
    return bytes.toString(CryptoJS.enc.Utf8)
  }
}