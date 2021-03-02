import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { View, Platform, Text, TouchableOpacity } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LinkingConfiguration from './LinkingConfiguration';
import ProjectsScreen from '../screens/ProjectsScreen';
import ProjectScreen from '../screens/ProjectScreen';
import BlankScreen from '../screens/BlankScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LogoSvg from "../svgs/logo"
import CalendarScreen from '../screens/CalendarScreen';
import EntryScreen from '../screens/EntryScreen';
import KanbanScreen from '../screens/KanbanScreen';
import NotificationsComponent from '../components/NotificationsComponent';
import NotesScreen from '../screens/NotesScreen';

export default function Navigation({ navigation }: any) {
  return (
    <NavigationContainer
      linking={LinkingConfiguration}
      theme={DarkTheme}>
      <RootNavigator navigation={navigation} />
    </NavigationContainer>
  );
}

const RootStack = createStackNavigator<any>();
const AuthStack = createStackNavigator<any>();
const AppBottomTab = createBottomTabNavigator<any>();
const AppStack = createStackNavigator<any>();

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
            tabBarOptions={{ activeTintColor: '#ffffff', style: Platform.OS === 'web' ? { position: 'absolute', top: 0, width: 800, marginLeft: 'auto', marginRight: 'auto', backgroundColor: '#000000' } : {}, labelStyle: Platform.OS !== 'web' ? { top: -12, fontSize: 20 } : {} }}>
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
              {props => <AppStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                <AppStack.Screen name="projects" component={ProjectsScreen} />
                <AppStack.Screen name="project" component={ProjectScreen} />
                <AppStack.Screen name="kanban" component={KanbanScreen} />
              </AppStack.Navigator>}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="calendar">
              {props => <AppStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                <AppStack.Screen name="timesheet" component={CalendarScreen} />
                <AppStack.Screen name="entry" component={EntryScreen} />
              </AppStack.Navigator>}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="notes">
              {props => <AppStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                <AppStack.Screen name="notes" component={NotesScreen} />
              </AppStack.Navigator>}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="settings">
              {props => <AppStack.Navigator {...props} screenOptions={{ headerShown: false }}>
                <AppStack.Screen name="settings" component={SettingsScreen} />
              </AppStack.Navigator>}
            </AppBottomTab.Screen>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="webcontrols"
                component={BlankScreen}
                options={{
                  tabBarButton: props =>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, width: 120 }}>
                      <TouchableOpacity style={{ borderColor: '#ffffff', borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, width: 25, marginRight: 30 }} onPress={() => { }} >
                        <Text style={{ color: '#ffffff', fontSize: 14, transform: [{ rotate: '90deg' }] }}>↻</Text>
                      </TouchableOpacity>
                      <NotificationsComponent />
                    </View>
                }}
              />}
          </AppBottomTab.Navigator>
        }
      </RootStack.Screen>
    </RootStack.Navigator >
  );
}