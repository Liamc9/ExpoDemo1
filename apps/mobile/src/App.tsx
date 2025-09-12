// App.tsx
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Home from "./screens/Home";
import CreateShop from "./screens/CreateShop";
import Seller from "./screens/Seller";
import Shop from "./screens/Shop";
import Checkout from "./screens/Checkout";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";
import Profile from "./screens/ProfileScreen";
import { AuthProvider, useAuth } from "./auth/AuthProvider";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/* Light theme (not overriding tab bar) */
const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0B1220",
    border: "#E5E9F0",
    primary: "#2563EB",
  },
};

function TabsNav({ navigation }: any) {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTitleStyle: { color: "#0B1220", fontWeight: "800" },
        headerTintColor: "#2563EB",
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={{
              marginRight: 12,
              backgroundColor: "#EEF2FF",
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Ionicons name="person" size={16} color="#1F2937" />
          </TouchableOpacity>
        ),
        tabBarIcon: ({ focused, color }) => {
          let icon: keyof typeof Ionicons.glyphMap = "ellipse";
          if (route.name === "Home") icon = focused ? "home" : "home-outline";
          if (route.name === "Seller")
            icon = focused ? "storefront" : "storefront-outline";
          return <Ionicons name={icon} size={20} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="Home"
        component={Home}
        options={{ title: "Discover" }}
      />
      <Tabs.Screen name="Seller" component={Seller} />
    </Tabs.Navigator>
  );
}

function RootNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTitleStyle: { color: "#0B1220", fontWeight: "800" },
        headerTintColor: "#2563EB",
      }}
    >
      {user ? (
        <>
          <Stack.Screen
            name="Root"
            component={TabsNav}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateShop"
            component={CreateShop}
            options={{ title: "Open a shop" }}
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
        </>
      ) : (
        <>
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={LightTheme}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
