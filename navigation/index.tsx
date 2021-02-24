import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { Dimensions, Platform, View, Text, TouchableOpacity } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LinkingConfiguration from './LinkingConfiguration';
import ProjectsScreen from '../screens/ProjectsScreen';
import ProjectScreen from '../screens/ProjectScreen';
import BlankScreen from '../screens/BlankScreen';
import { RootStackParamList, AuthStackParamList, AppBottomTabParamList, TabOneStackParamList, TabTwoStackParamList } from '../types';
import SettingsScreen from '../screens/SettingsScreen';
import LogoSvg from "../svgs/logo"
import CalendarScreen from '../screens/CalendarScreen';
import EntryScreen from '../screens/EntryScreen';

export default function Navigation({ navigation }: any) {
  return (
    <NavigationContainer
      linking={LinkingConfiguration}
      theme={DarkTheme}>
      <RootNavigator navigation={navigation} />
    </NavigationContainer>
  );
}

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const AppBottomTab = createBottomTabNavigator<AppBottomTabParamList>();
const AppStack = createStackNavigator<AppBottomTabParamList>();
const TabOneStack = createStackNavigator<TabOneStackParamList>();
const TabTwoStack = createStackNavigator<TabTwoStackParamList>();

function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="auth" options={{ animationEnabled: false }}>
        {props => <AuthStack.Navigator {...props} screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="login" component={LoginScreen} options={{ animationEnabled: false }} />
          <AuthStack.Screen name="signup" component={SignupScreen} options={{ animationEnabled: false }} />
        </AuthStack.Navigator>}
      </RootStack.Screen>
      <RootStack.Screen name="app" options={{ animationEnabled: false }}>
        {props =>
          <AppBottomTab.Navigator {...props} initialRouteName="projects"
            tabBarOptions={{ activeTintColor: '#ffffff', style: Platform.OS === 'web' ? { position: 'absolute', top: 0, width: 800, marginLeft: 'auto', marginRight: 'auto' } : {}, labelStyle: Platform.OS !== 'web' ? { top: -12, fontSize: 20 } : {} }}>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="logo"
                component={BlankScreen}
                options={{
                  tabBarButton: props =>
                    <TouchableOpacity onPress={() => { }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <LogoSvg width={25} height={25} style={{ marginRight: 5 }} />
                      <Text style={{ color: '#ffffff', fontSize: 20 }}>productabot</Text>
                    </TouchableOpacity>
                }}
              />}
            <AppBottomTab.Screen name="projects">
              {props => <TabOneStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                <TabOneStack.Screen name="projects" component={ProjectsScreen} />
                <TabOneStack.Screen name="project" component={ProjectScreen} />
              </TabOneStack.Navigator>}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="timesheet">
              {props => <TabTwoStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                <TabOneStack.Screen name="calendar" component={CalendarScreen} />
                <TabOneStack.Screen name="entry" component={EntryScreen} />
              </TabTwoStack.Navigator>}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="notifications">
              {props => <TabTwoStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                <TabOneStack.Screen name="blank" component={BlankScreen} />
              </TabTwoStack.Navigator>}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="settings">
              {props => <TabTwoStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                <TabOneStack.Screen name="settings" component={SettingsScreen} />
              </TabTwoStack.Navigator>}
            </AppBottomTab.Screen>
          </AppBottomTab.Navigator>
        }
      </RootStack.Screen>
    </RootStack.Navigator >
  );
}