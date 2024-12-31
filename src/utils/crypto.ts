import CryptoJS from 'crypto-js'
import bcrypt from 'bcryptjs'
import { sm3 } from 'sm-crypto'
import * as rs from 'jsrsasign'

// 哈希函数类
export class HashFunctions {
  static md5(text: string): string {
    return CryptoJS.MD5(text).toString()
  }

  static sha256(text: string): string {
    return CryptoJS.SHA256(text).toString()
  }

  static sha512(text: string): string {
    return CryptoJS.SHA512(text).toString()
  }

  static sha3(text: string): string {
    return CryptoJS.SHA3(text).toString()
  }

  static sm3(text: string): string {
    return sm3(text)
  }

  static ripemd160(text: string): string {
    return CryptoJS.RIPEMD160(text).toString()
  }
}

// 对称加密类
export class SymmetricEncryption {
  // AES 加密
  static aesEncrypt(text: string, key: string): string {
    return CryptoJS.AES.encrypt(text, key).toString()
  }

  static aesDecrypt(ciphertext: string, key: string): string {
    return CryptoJS.AES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8)
  }

  // DES 加密
  static desEncrypt(text: string, key: string): string {
    return CryptoJS.DES.encrypt(text, key).toString()
  }

  static desDecrypt(ciphertext: string, key: string): string {
    return CryptoJS.DES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8)
  }

  // Triple DES 加密
  static tripleDesEncrypt(text: string, key: string): string {
    return CryptoJS.TripleDES.encrypt(text, key).toString()
  }

  static tripleDesDecrypt(ciphertext: string, key: string): string {
    return CryptoJS.TripleDES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8)
  }
}

// 非对称加密类
export class AsymmetricEncryption {
  // RSA 密钥对生成
  static generateRSAKeyPair(keySize: number = 2048): { publicKey: string; privateKey: string } {
    const keyPair = rs.KEYUTIL.generateKeypair('RSA', keySize)
    return {
      publicKey: rs.KEYUTIL.getPEM(keyPair.pub),
      privateKey: rs.KEYUTIL.getPEM(keyPair.prv, 'PKCS8PRV'),
    }
  }

  // RSA 加密
  static rsaEncrypt(text: string, publicKey: string): string {
    const pub = rs.KEYUTIL.getKey(publicKey)
    return rs.crypto.Cipher.encrypt(text, pub)
  }

  // RSA 解密
  static rsaDecrypt(ciphertext: string, privateKey: string): string {
    const prv = rs.KEYUTIL.getKey(privateKey)
    return rs.crypto.Cipher.decrypt(ciphertext, prv)
  }
}

// 密码哈希类
export class PasswordHashing {
  // Bcrypt 哈希
  static async bcryptHash(password: string, saltRounds: number = 10): Promise<string> {
    return await bcrypt.hash(password, saltRounds)
  }

  // Bcrypt 验证
  static async bcryptVerify(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }
}

// Base64 编码解码
export class Base64 {
  static encode(text: string): string {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text))
  }

  static decode(base64: string): string {
    return CryptoJS.enc.Base64.parse(base64).toString(CryptoJS.enc.Utf8)
  }
}