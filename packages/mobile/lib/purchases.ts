import { Platform } from 'react-native';

// react-native-purchases is a native module — not available in Expo Go.
// We lazy-require it so the app doesn't crash in Expo Go; all functions
// degrade gracefully (user is treated as free tier).
let Purchases: any = null;
try {
  Purchases = require('react-native-purchases').default;
} catch {}

export const ENTITLEMENT_PRO = 'pro';

const IOS_KEY     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY     ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export async function initializePurchases(clerkUserId: string): Promise<void> {
  if (!Purchases) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    console.warn('[Purchases] No RevenueCat API key set for', Platform.OS);
    return;
  }
  try {
    Purchases.configure({ apiKey });
    await Purchases.logIn(clerkUserId);
  } catch (e) {
    console.warn('[Purchases] Init failed:', e);
  }
}

export async function getCustomerInfo(): Promise<any | null> {
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function getOfferings(): Promise<any | null> {
  if (!Purchases) return null;
  try {
    return await Purchases.getOfferings();
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any): Promise<any> {
  if (!Purchases) throw new Error('In-app purchases not available in this build.');
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases(): Promise<any> {
  if (!Purchases) throw new Error('In-app purchases not available in this build.');
  return Purchases.restorePurchases();
}

export function hasProEntitlement(customerInfo: any): boolean {
  if (!customerInfo) return false;
  return ENTITLEMENT_PRO in (customerInfo?.entitlements?.active ?? {});
}
