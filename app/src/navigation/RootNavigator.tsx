import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";

import MainTabs from "./MainTabs";

// Screens
import SignInScreen from "../screens/entry/SignIn.screen";

import Home from "../screens/Home"; // not required here, but safe if referenced elsewhere
import Seller from "../screens/Seller"; // not required here
import Shop from "../screens/Shop";
import Orders from "../screens/Orders"; // not required here

import Profile from "../screens/account/Profile.screen";
import HelpAndSupport from "../screens/account/HelpAndSupport.screen";
import ContactSupport from "../screens/account/ContactSupport";
import ManageAccount from "../screens/account/ManageAccount.screen";
import ManagePreferences from "../screens/account/ManagePreferences.screen";

import CreateShopDetails from "../screens/CreateShopDetails";
import VerifyIdentity from "../screens/VerifyIdentity";
import ConnectBank from "../screens/ConnectBank";

import OrderDetail from "../screens/OrderDetail";

// Dev / demos
import DevMenu from "../screens/DevMenu";
import GameScreen from "../screens/games/GameScreen";
import WordleScreen from "../screens/games/WordleScreen";
import ThreeRunnerScreen from "../screens/games/ThreeRunnerScreen";
import WaterSortScreen from "../screens/games/WaterSortScreen";
import RapidApiScreen from "../screens/RapidApiScreen";
import RapidDemoScreen from "../screens/RapidDemoScreen";

// Finance (remove if not needed)
import Overview from "../screens/financedemo/Overview";
import Transactions from "../screens/financedemo/Transactions";
import Assets from "../screens/financedemo/Assets";
import Liabilities from "../screens/financedemo/Liabilities";
import Goals from "../screens/financedemo/Goals";
import IncomeExpenses from "../screens/financedemo/IncomeExpenses";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { colors } = useTheme();
  const { user } = useAuth();

  return (
    <Stack.Navigator
      id="RootNavigator"
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text, fontWeight: "800" as const },
        headerTintColor: colors.primary,
      }}
    >
      {!user ? (
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
      ) : (
        <>
          {/* Tabs shell */}
          <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />

          {/* Core flows */}
          <Stack.Screen name="Shop" component={Shop} options={{ headerShown: false }} />
          <Stack.Screen name="OrderDetail" component={OrderDetail} options={{ title: "Order" }} />

          {/* Account */}
          <Stack.Screen name="Profile" component={Profile} options={{ title: "Your profile" }} />
          <Stack.Screen name="ManageAccount" component={ManageAccount} options={{ title: "Manage account" }} />
          <Stack.Screen name="ManagePreferences" component={ManagePreferences} options={{ title: "Preferences" }} />
          <Stack.Screen name="HelpAndSupport" component={HelpAndSupport} options={{ title: "Help & Support" }} />
          <Stack.Screen name="ContactSupport" component={ContactSupport} options={{ title: "Contact support" }} />

          {/* Seller */}
          <Stack.Screen name="CreateShopDetails" component={CreateShopDetails} options={{ title: "Create shop" }} />
          <Stack.Screen name="VerifyIdentity" component={VerifyIdentity} options={{ title: "Verify identity" }} />
          <Stack.Screen name="ConnectBank" component={ConnectBank} options={{ title: "Connect bank" }} />

          {/* Finance (optional) */}
          <Stack.Screen name="Overview" component={Overview} />
          <Stack.Screen name="Transactions" component={Transactions} />
          <Stack.Screen name="Assets" component={Assets} />
          <Stack.Screen name="Liabilities" component={Liabilities} />
          <Stack.Screen name="Goals" component={Goals} />
          <Stack.Screen name="IncomeExpenses" component={IncomeExpenses} options={{ title: "Income & Expenses" }} />

          {/* Dev-only (keep out of tabs) */}
          {__DEV__ ? (
            <>
              <Stack.Screen name="DevMenu" component={DevMenu} options={{ title: "Dev" }} />
              <Stack.Screen name="GameScreen" component={GameScreen} options={{ title: "Game Demo" }} />
              <Stack.Screen name="WordleScreen" component={WordleScreen} options={{ title: "Wordle Demo" }} />
              <Stack.Screen name="ThreeRunnerScreen" component={ThreeRunnerScreen} options={{ title: "3D Runner Demo" }} />
              <Stack.Screen name="WaterSortScreen" component={WaterSortScreen} options={{ title: "Water Sort Demo" }} />
              <Stack.Screen name="RapidApiScreen" component={RapidApiScreen} options={{ title: "Rapid API Demo" }} />
              <Stack.Screen name="RapidDemoScreen" component={RapidDemoScreen} options={{ title: "Rapid API Extended Demo" }} />
            </>
          ) : null}
        </>
      )}
    </Stack.Navigator>
  );
}
