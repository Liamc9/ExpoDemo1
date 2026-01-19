import React from "react";
import { TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";

import Home from "../screens/Home";
import Orders from "../screens/Orders";
import Seller from "../screens/Seller";
import More from "../screens/account/More";

const Tabs = createBottomTabNavigator();

export default function MainTabs({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <Tabs.Navigator
      id="MainTabs"
      screenOptions={({ route }) => ({
        // Header
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text, fontWeight: "800" as const },
        headerTintColor: colors.primary,

        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={{
              marginRight: 12,
              marginBottom: 4,
              backgroundColor: colors.primary,
              borderRadius: 999,
              padding: 8,
            }}
          >
            <Ionicons name="person" size={16} color={colors.background} />
          </TouchableOpacity>
        ),

        // Tabs
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.secondary,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },

        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? "home" : "home-outline",
            Orders: focused ? "receipt" : "receipt-outline",
            Seller: focused ? "storefront" : "storefront-outline",
            More: "ellipsis-horizontal",
          };
          return <Ionicons name={icons[route.name] ?? "ellipse"} size={20} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={Home} options={{ title: "Discover" }} />
      <Tabs.Screen name="Orders" component={Orders} options={{ title: "Orders" }} />
      <Tabs.Screen name="Seller" component={Seller} options={{ title: "Seller" }} />
      <Tabs.Screen name="More" component={More} options={{ title: "More" }} />
    </Tabs.Navigator>
  );
}
