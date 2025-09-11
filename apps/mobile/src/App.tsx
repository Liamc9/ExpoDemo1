import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Platform, View, ActivityIndicator } from "react-native";

import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ChatsListScreen from "./screens/ChatsListScreen";
import ChatScreen from "./screens/ChatScreen";
import SearchScreen from "./screens/SearchScreen";
import FirebaseTestScreen from "./screens/FirebaseTestScreen";

import { AuthProvider, useAuth } from "./auth/AuthProvider";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";

type RootStackParamList = { Main: undefined; Profile: undefined };
type ChatsStackParamList = {
  ChatsList: undefined;
  Chat: { chatId: string; title: string };
};
type AuthStackParamList = { SignIn: undefined; SignUp: undefined };

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();
const ChatsStack = createNativeStackNavigator<ChatsStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function ChatsStackNavigator() {
  return (
    <ChatsStack.Navigator>
      <ChatsStack.Screen
        name="ChatsList"
        component={ChatsListScreen}
        options={{ title: "Chats" }}
      />
      <ChatsStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </ChatsStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "tomato",
        tabBarInactiveTintColor: "gray",
        tabBarIcon: ({ color, size, focused }) => {
          let name: keyof typeof Ionicons.glyphMap = "ellipse-outline";
          if (route.name === "Home") name = focused ? "home" : "home-outline";
          if (route.name === "Chats")
            name = focused ? "chatbubbles" : "chatbubbles-outline";
          if (route.name === "Settings")
            name = focused ? "settings" : "settings-outline";
          if (route.name === "Search")
            name = focused ? "search" : "search-outline";
          if (route.name === "FirebaseTest")
            name = focused ? "flame" : "flame-outline";
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chats" component={ChatsStackNavigator} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen
        name="FirebaseTest"
        component={FirebaseTestScreen}
        options={{ title: "Firebase" }}
      />
    </Tab.Navigator>
  );
}

// --- Auth stack when user is logged out ---
function AuthStackNavigator() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ title: "Sign In" }}
      />
      <AuthStack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: "Create Account" }}
      />
    </AuthStack.Navigator>
  );
}

// --- Gate that decides which stack to show ---
function InnerNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <AuthStackNavigator />;
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={({ navigation }) => ({
          title: "My App",
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate("Profile")}
              hitSlop={10}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingHorizontal: 6,
              })}
              android_ripple={
                Platform.OS === "android" ? { borderless: true } : undefined
              }
            >
              <Ionicons name="person-circle-outline" size={24} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <InnerNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
