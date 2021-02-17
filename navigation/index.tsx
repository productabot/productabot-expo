import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { Dimensions } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LinkingConfiguration from './LinkingConfiguration';
import ProjectsScreen from '../screens/ProjectsScreen';
import BlankScreen from '../screens/BlankScreen';
import { RootStackParamList, AuthStackParamList, AppBottomTabParamList, TabOneStackParamList, TabTwoStackParamList } from '../types';

export default function Navigation() {
  return (
    <NavigationContainer
      linking={LinkingConfiguration}
      theme={DarkTheme}>
      <RootNavigator />
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
      <RootStack.Screen name="Auth" options={{ animationEnabled: false }}>
        {props => <AuthStack.Navigator {...props} screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ animationEnabled: false }} />
          <AuthStack.Screen name="Signup" component={SignupScreen} options={{ animationEnabled: false }} />
        </AuthStack.Navigator>}
      </RootStack.Screen>
      <RootStack.Screen name="App" options={{ animationEnabled: false }}>
        {props =>
          Dimensions.get('window').width < 800 ?
            <AppBottomTab.Navigator {...props}
              tabBarOptions={{ activeTintColor: '#ffffff' }}>
              <AppBottomTab.Screen name="Projects">
                {props => <TabOneStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                  <TabOneStack.Screen name="Projects" component={ProjectsScreen} />
                </TabOneStack.Navigator>}
              </AppBottomTab.Screen>
              <AppBottomTab.Screen name="Timesheet">
                {props => <TabTwoStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                  <TabOneStack.Screen name="Blank" component={BlankScreen} />
                </TabTwoStack.Navigator>}
              </AppBottomTab.Screen>
              <AppBottomTab.Screen name="Calendar">
                {props => <TabTwoStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                  <TabOneStack.Screen name="Blank" component={BlankScreen} />
                </TabTwoStack.Navigator>}
              </AppBottomTab.Screen>
              <AppBottomTab.Screen name="Settings">
                {props => <TabTwoStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                  <TabOneStack.Screen name="Blank" component={BlankScreen} />
                </TabTwoStack.Navigator>}
              </AppBottomTab.Screen>
            </AppBottomTab.Navigator>
            :
            <AppStack.Navigator {...props} screenOptions={{ headerShown: false }}>
              <AppBottomTab.Screen name="Projects">
                {props => <TabOneStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                  <TabOneStack.Screen name="Projects" component={ProjectsScreen} />
                </TabOneStack.Navigator>}
              </AppBottomTab.Screen>
              <AppBottomTab.Screen name="Timesheet">
                {props => <TabTwoStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                  <TabOneStack.Screen name="Blank" component={BlankScreen} />
                </TabTwoStack.Navigator>}
              </AppBottomTab.Screen>
              <AppBottomTab.Screen name="Calendar">
                {props => <TabTwoStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                  <TabOneStack.Screen name="Blank" component={BlankScreen} />
                </TabTwoStack.Navigator>}
              </AppBottomTab.Screen>
              <AppBottomTab.Screen name="Settings">
                {props => <TabTwoStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                  <TabOneStack.Screen name="Blank" component={BlankScreen} />
                </TabTwoStack.Navigator>}
              </AppBottomTab.Screen>
            </AppStack.Navigator>
        }
      </RootStack.Screen>
    </RootStack.Navigator >
  );
}