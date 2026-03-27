// lib/webpush.ts — Web Push nativo sem dependências externas
// Implementa VAPID + envio de notificações push usando Node.js crypto

import * as crypto from 'crypto'

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT     = 'mailto:admin@hgu.ao'

// Converter base64url para Buffer
function base64urlToBuffer(b64: string): Buffer {
  const base64 = b64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  return Buffer.from(pad ? base64 + '='.repeat(4 - pad) : base64, 'base64')
}

// Converter Buffer para base64url
function bufferToBase64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Gerar JWT VAPID
async function gerarVapidJWT(audience: string): Promise<string> {
  const header  = bufferToBase64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = bufferToBase64url(Buffer.from(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })))

  const input = `${header}.${payload}`

  const privateKeyDer = (() => {
    const rawKey = base64urlToBuffer(VAPID_PRIVATE_KEY)
    // Construir chave EC em formato DER pkcs8
    const prefix = Buffer.from('308193020100301306072a8648ce3d020106082a8648ce3d030107047930770201010420', 'hex')
    const suffix = Buffer.from('a00a06082a8648ce3d030107a14403420004', 'hex')
    // Gerar a chave pública a partir da privada
    const ecdh = crypto.createECDH('prime256v1')
    ecdh.setPrivateKey(rawKey)
    const pubKey = ecdh.getPublicKey()
    return Buffer.concat([prefix, rawKey, suffix, pubKey])
  })()

  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' })
  const sign = crypto.createSign('SHA256')
  sign.update(input)
  const derSig = sign.sign(privateKey)

  // Converter DER para raw (r + s de 32 bytes cada)
  let offset = 2
  if (derSig[1] === 0x81) offset = 3
  const rLen = derSig[offset + 1]
  const r = derSig.slice(offset + 2, offset + 2 + rLen).slice(-32)
  const sLen = derSig[offset + 2 + rLen + 1]
  const s = derSig.slice(offset + 2 + rLen + 2, offset + 2 + rLen + 2 + sLen).slice(-32)

  const sig = Buffer.concat([
    Buffer.concat([Buffer.alloc(32 - r.length), r]),
    Buffer.concat([Buffer.alloc(32 - s.length), s]),
  ])

  return `${input}.${bufferToBase64url(sig)}`
}

// Encriptar payload com ECDH + AES-128-GCM (RFC 8291)
async function encriptarPayload(
  subscription: PushSubscription,
  payload: string
): Promise<{ ciphertext: Buffer; salt: Buffer; serverPublicKey: Buffer }> {
  const salt = crypto.randomBytes(16)
  const serverECDH = crypto.createECDH('prime256v1')
  serverECDH.generateKeys()

  const clientPublicKey = base64urlToBuffer(subscription.keys.p256dh)
  const authSecret      = base64urlToBuffer(subscription.keys.auth)

  const sharedSecret = serverECDH.computeSecret(clientPublicKey)
  const serverPublicKey = serverECDH.getPublicKey()

  // HKDF para derivar chaves
  const hkdf = (ikm: Buffer, salt: Buffer, info: Buffer, length: number): Buffer => {
    const prk = crypto.createHmac('sha256', salt).update(ikm).digest()
    const infoBuffer = Buffer.concat([info, Buffer.from([1])])
    return crypto.createHmac('sha256', prk).update(infoBuffer).digest().slice(0, length)
  }

  const prk = hkdf(
    sharedSecret,
    authSecret,
    Buffer.concat([Buffer.from('Content-Encoding: auth\0'), Buffer.alloc(0)]),
    32
  )

  const context = Buffer.concat([
    Buffer.from('P-256\0'),
    Buffer.alloc(2),
    Buffer.from([clientPublicKey.length]),
    clientPublicKey,
    Buffer.alloc(2),
    Buffer.from([serverPublicKey.length]),
    serverPublicKey,
  ])

  const cek = hkdf(prk, salt, Buffer.concat([Buffer.from('Content-Encoding: aesgcm\0'), context]), 16)
  const nonce = hkdf(prk, salt, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), context]), 12)

  const payloadBuf = Buffer.from(payload, 'utf8')
  const padded = Buffer.concat([Buffer.alloc(2), payloadBuf])

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
  const ciphertext = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()])

  return { ciphertext, salt, serverPublicKey }
}

export interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

// Enviar notificação push
export async function enviarNotificacaoPush(
  subscription: PushSubscription,
  titulo: string,
  corpo: string,
  dados?: Record<string, any>
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint)
    const audience = `${url.protocol}//${url.host}`
    const jwt = await gerarVapidJWT(audience)

    const payload = JSON.stringify({ titulo, corpo, dados })
    const { ciphertext, salt, serverPublicKey } = await encriptarPayload(subscription, payload)

    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization':  `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
        'Content-Type':   'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Encryption':     `salt=${bufferToBase64url(salt)}`,
        'Crypto-Key':     `dh=${bufferToBase64url(serverPublicKey)};p256ecdsa=${VAPID_PUBLIC_KEY}`,
        'TTL':            '86400',
      },
      body: new Uint8Array(ciphertext),
    })

    return res.ok || res.status === 201
  } catch (err) {
    console.error('Erro ao enviar push:', err)
    return false
  }
}