import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import {
  PlatformPay,
  PlatformPayButton,
  confirmPlatformPayPayment,
  isPlatformPaySupported,
} from "@stripe/stripe-react-native";

export function ApplePayButton() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await isPlatformPaySupported();
      setSupported(ok);
    })();
  }, []);

  if (!supported) return null;

  const pay = async () => {
    try {
      // Call your deployed Firebase Function
      const base = "pk_test_51SDWBl3BApC2wVuMGPUAit5mqCmfDdOrd9mrsD88QKnBpdfkRgo6GO7Ik6mDN6jBm0GV1txFuSkxAF4CL0C5e8DK00zwr1uUZD";
      const response = await fetch(`${base}/createPaymentIntent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 2599, currency: "gbp" }), // £25.99
      });
      const { clientSecret, error } = await response.json();
      if (error) throw new Error(error);

      // Show the Apple Pay sheet
      const { error: confirmError } = await confirmPlatformPayPayment(
        clientSecret,
        {
          applePay: {
            cartItems: [
              {
                label: "Cap",
                amount: "20.00",
                paymentType: PlatformPay.PaymentType.Immediate,
              },
              {
                label: "VAT",
                amount: "5.99",
                paymentType: PlatformPay.PaymentType.Immediate,
              },
              {
                label: "Your Company Ltd",
                amount: "25.99",
                paymentType: PlatformPay.PaymentType.Immediate,
              },
            ],
            merchantCountryCode: "GB",
            currencyCode: "GBP",
          },
        }
      );

      if (confirmError) {
        Alert.alert("Payment failed", confirmError.message);
      } else {
        Alert.alert("Success", "Apple Pay payment confirmed!");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <PlatformPayButton
        type={PlatformPay.ButtonType.Buy}
        appearance={PlatformPay.ButtonStyle.Black}
        onPress={pay}
        borderRadius={8}
        style={{ width: "100%", height: 50 }}
      />
    </View>
  );
}
