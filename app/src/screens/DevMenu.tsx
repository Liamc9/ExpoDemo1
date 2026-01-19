import React, { useMemo } from "react";
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../providers/ThemeProvider"; // <-- import your hook

export default function DevMenu() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme(); // <-- access theme colors

  const screens = ["Home", "Shop", "Checkout", "Seller", "SignInScreen", "ProfileScreen", "More", "HelpAndSupport", "ContactSupport", "ManageAccount", "ManagePreferences", "CreateShopDetails", "VerifyIdentity", "ConnectBank", "GameScreen", "Orders", "OrderDetail", "WordleScreen", "ThreeRunnerScreen", "WaterSortScreen", "Overview", "Transactions", "Assets", "Liabilities", "Goals", "IncomeExpenses", "RapidApiScreen", "RapidDemoScreen"];

  // Memoize styles so they rebuild when colors change
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        content: {
          padding: 20,
        },
        title: {
          fontSize: 22,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 16,
        },
        button: {
          backgroundColor: colors.primary,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          marginBottom: 10,
        },
        buttonText: {
          color: colors.background,
          fontSize: 16,
          fontWeight: "500",
        },
      }),
    [colors]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🧪 Dev Menu</Text>

      {screens.map((screen) => (
        <TouchableOpacity key={screen} style={styles.button} onPress={() => navigation.navigate(screen as never)}>
          <Text style={styles.buttonText}>{screen}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
