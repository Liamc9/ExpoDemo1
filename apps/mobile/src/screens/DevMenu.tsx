// screens/DevMenu.tsx
import React from "react";
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme"; // optional — use your theme if you have one

export default function DevMenu() {
  const navigation = useNavigation<any>();

  const screens = ["Home", "Shop", "Checkout", "Seller", "SignInScreen", "ProfileScreen", "More", "HelpAndSupport", "ContactSupport", "ManageAccount", "ManagePreferences", "CreateShopDetails", "VerifyIdentity", "ConnectBank", "GameScreen", "Orders", "OrderDetail", "WordleScreen", "ThreeRunnerScreen", "WaterSortScreen", "Overview", "Transactions", "Assets", "Liabilities", "Goals", "IncomeExpenses", "RapidApiScreen"];

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7F9",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors?.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});
