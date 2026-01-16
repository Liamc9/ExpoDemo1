// src/providers/StripeAppProvider.tsx
import React from "react";
import { StripeProvider } from "@stripe/stripe-react-native";
import Constants from "expo-constants";

type Props = { children: React.ReactElement | React.ReactElement[] };

export default function StripeAppProvider({ children }: Props) {
  const { STRIPE_PUBLISHABLE_KEY } = (Constants?.expoConfig?.extra ?? (Constants?.manifest as any)?.extra ?? {}) as { STRIPE_PUBLISHABLE_KEY?: string };

  if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn("Missing STRIPE_PUBLISHABLE_KEY");
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY || ""}
      merchantIdentifier="merchant.com.basil.payments" // Apple Pay
      urlScheme="mobile" // iOS 11+ for 3DS flows
      setReturnUrlSchemeOnAndroid={true} // Android return flows
    >
      {children}
    </StripeProvider>
  );
}
