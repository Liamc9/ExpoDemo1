import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./providers/AuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import RootNavigator from "./navigation/RootNavigator";
//import { StripeAppProvider } from "./providers/StripeProvider";

const queryClient = new QueryClient();

export default function App() {
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: "#43A047", // ✅ this fixes the root background
    },
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          {/* <StripeAppProvider> */}
          <QueryClientProvider client={queryClient}>
            <NavigationContainer theme={navTheme}>
              <RootNavigator />
            </NavigationContainer>
          </QueryClientProvider>
          {/* </StripeAppProvider> */}
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
