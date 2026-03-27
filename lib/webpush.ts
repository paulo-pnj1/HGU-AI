// lib/webpush.ts — Web Push usando o pacote web-push

// @ts-ignore
import webpush from 'web-push'

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!

webpush.setVapidDetails(
  'mailto:admin@hgu.ao',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

export interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function enviarNotificacaoPush(
  subscription: PushSubscription,
  titulo: string,
  corpo: string,
  dados?: Record<string, any>
): Promise<boolean> {
  try {
    const payload = JSON.stringify({ titulo, corpo, dados })
    await webpush.sendNotification(subscription, payload)
    console.log('Push enviado para:', subscription.endpoint.slice(0, 50))
    return true
  } catch (err: any) {
    console.error('Erro ao enviar push:', err?.statusCode, err?.body)
    return false
  }
}