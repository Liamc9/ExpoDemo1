import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
import DevMenu from "./screens/DevMenu";
import GameScreen from "./screens/GameScreen";
import WordleScreen from "./screens/WordleScreen";
import ThreeRunnerScreen from "./screens/ThreeRunnerScreen";
import WaterSortScreen from "./screens/WaterSortScreen";
import Overview from "./screens/Overview";
import Transactions from "./screens/Transactions";
import Assets from "./screens/Assets";
import Liabilities from "./screens/Liabilities";
import Goals from "./screens/Goals";
import IncomeExpenses from "./screens/IncomeExpenses";
import RapidApiScreen from "./screens/RapidApiScreen";
import RapidDemoScreen from "./screens/RapidDemoScreen";

import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { ThemeProvider, useTheme } from "./providers/ThemeProvider";
import StripeAppProvider from "./providers/StripeProvider";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

const nameMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Orders: "receipt-outline",
  Seller: "storefront-outline",
  More: "ellipsis-horizontal",
};

function TabsNav({ navigation }: any) {
  const { colors } = useTheme();

  const HEADER_OPTIONS = {
    headerStyle: { backgroundColor: colors.card },
    headerTitleStyle: { color: colors.text, fontWeight: "800" as const },
    headerTintColor: colors.primary,
  };

  const TAB_OPTIONS = {
    tabBarActiveTintColor: colors.text,
    tabBarInactiveTintColor: colors.secondary,
    tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
  };

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
          let iconName = nameMap[route.name] || "ellipse";
          if (route.name === "Home" && focused) iconName = "home";
          if (route.name === "Orders" && focused) iconName = "receipt";
          if (route.name === "Seller" && focused) iconName = "storefront";
          return <Ionicons name={iconName} size={20} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={Home} options={{ title: "Discover" }} />
      <Tabs.Screen name="Orders" component={Orders} options={{ title: "Orders" }} />
      <Tabs.Screen name="Seller" component={Seller} />
      <Tabs.Screen name="More" component={More} />
      <Tabs.Screen name="Dev" component={DevMenu} />
    </Tabs.Navigator>
  );
}

function RootNavigator() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const HEADER_OPTIONS = {
    headerStyle: { backgroundColor: colors.card },
    headerTitleStyle: { color: colors.text, fontWeight: "800" as const },
    headerTintColor: colors.primary,
  };

  return (
    <Stack.Navigator screenOptions={HEADER_OPTIONS}>
      {user ? (
        <>
          <Stack.Screen name="Root" component={TabsNav} options={{ headerShown: false }} />
          <Stack.Screen name="Shop" component={Shop} options={{ headerShown: false }} />
          <Stack.Screen name="Checkout" component={Checkout} options={{ title: "Checkout" }} />
          <Stack.Screen name="Profile" component={Profile} options={{ title: "Your profile" }} />
          <Stack.Screen name="HelpAndSupport" component={HelpAndSupport} />
          <Stack.Screen name="ContactSupport" component={ContactSupport} />
          <Stack.Screen name="OrderDetail" component={OrderDetail} />
          <Stack.Screen name="ManageAccount" component={ManageAccount} />
          <Stack.Screen name="ManagePreferences" component={ManagePreferences} />
          <Stack.Screen name="CreateShopDetails" component={CreateShopDetails} />
          <Stack.Screen name="VerifyIdentity" component={VerifyIdentity} />
          <Stack.Screen name="ConnectBank" component={ConnectBank} />
          <Stack.Screen name="DevMenu" component={DevMenu} />
          <Stack.Screen name="GameScreen" component={GameScreen} options={{ title: "Game Demo" }} />
          <Stack.Screen name="WordleScreen" component={WordleScreen} options={{ title: "Wordle Demo" }} />
          <Stack.Screen name="ThreeRunnerScreen" component={ThreeRunnerScreen} options={{ title: "3D Runner Demo" }} />
          <Stack.Screen name="WaterSortScreen" component={WaterSortScreen} options={{ title: "Water Sort Demo" }} />
          <Stack.Screen name="Overview" component={Overview} />
          <Stack.Screen name="Transactions" component={Transactions} />
          <Stack.Screen name="Assets" component={Assets} />
          <Stack.Screen name="Liabilities" component={Liabilities} />
          <Stack.Screen name="Goals" component={Goals} />
          <Stack.Screen name="IncomeExpenses" component={IncomeExpenses} />
          <Stack.Screen name="RapidApiScreen" component={RapidApiScreen} options={{ title: "Rapid API Demo" }} />
          <Stack.Screen name="RapidDemoScreen" component={RapidDemoScreen} options={{ title: "Rapid API Extended Demo" }} />
        </>
      ) : (
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StripeAppProvider>
            <QueryClientProvider client={queryClient}>
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            </QueryClientProvider>
          </StripeAppProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
