// App.tsx
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";

import Home from "./screens/Home";
import Seller from "./screens/Seller";
import Shop from "./screens/Shop";
import Checkout from "./screens/Checkout";
import SignInScreen from "./screens/SignInScreen";
import Profile from "./screens/ProfileScreen";
import More from "./screens/More";
import HelpAndSupport from "./screens/HelpAndSupport";
import ContactSupport from "./screens/ContactSupport";
import ManageAccount from "./screens/ManageAccount";
import ManagePreferences from "./screens/ManagePreferences";
import CreateShopDetails from "./screens/CreateShopDetails";
import VerifyIdentity from "./screens/VerifyIdentity";
import ConnectBank from "./screens/ConnectBank";
import Orders from "./screens/Orders";
import OrderDetail from "./screens/OrderDetail";

import { AuthProvider, useAuth } from "./auth/AuthProvider";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Shared header/tab styling
const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: colors.card },
  headerTitleStyle: { color: colors.text, fontWeight: "800" as const },
  headerTintColor: colors.primary,
};
const TAB_OPTIONS = {
  tabBarActiveTintColor: colors.text,
  tabBarInactiveTintColor: "#94A3B8",
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
};

function TabsNav({ navigation }: any) {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        ...HEADER_OPTIONS,
        ...TAB_OPTIONS,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={{
              marginRight: 12,
              marginBottom: 4,
              backgroundColor: colors.primary,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 8,
            }}
          >
            <Ionicons name="person" size={16} color={colors.background} />
          </TouchableOpacity>
        ),
        tabBarIcon: ({ focused, color }) => {
          const nameMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? "home" : "home-outline",
            Orders: focused ? "receipt" : "receipt-outline",
            Seller: focused ? "storefront" : "storefront-outline",
            More: "ellipsis-horizontal",
          };
          return (
            <Ionicons
              name={nameMap[route.name] ?? "ellipse"}
              size={20}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen
        name="Home"
        component={Home}
        options={{ title: "Discover" }}
      />
      <Tabs.Screen
        name="Orders"
        component={Orders}
        options={{ title: "Orders" }}
      />
      <Tabs.Screen name="Seller" component={Seller} />
      <Tabs.Screen name="More" component={More} />
    </Tabs.Navigator>
  );
}

function RootNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={HEADER_OPTIONS}>
      {user ? (
        <>
          <Stack.Screen
            name="Root"
            component={TabsNav}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Shop"
            component={Shop}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Checkout"
            component={Checkout}
            options={{ title: "Checkout" }}
          />
          <Stack.Screen
            name="Profile"
            component={Profile}
            options={{ title: "Your profile" }}
          />
          <Stack.Screen name="HelpAndSupport" component={HelpAndSupport} />
          <Stack.Screen name="ContactSupport" component={ContactSupport} />
          <Stack.Screen name="OrderDetail" component={OrderDetail} />
          <Stack.Screen name="ManageAccount" component={ManageAccount} />
          <Stack.Screen
            name="ManagePreferences"
            component={ManagePreferences}
          />
          <Stack.Screen
            name="CreateShopDetails"
            component={CreateShopDetails}
          />
          <Stack.Screen name="VerifyIdentity" component={VerifyIdentity} />
          <Stack.Screen name="ConnectBank" component={ConnectBank} />
        </>
      ) : (
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
