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
import NoteScreen from '../screens/NoteScreen';
import * as root from '../Root';
import DocumentScreen from '../screens/DocumentScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import ResetScreen from '../screens/ResetScreen';

export default function Navigation({ navigation }: any) {
  return (
    <NavigationContainer
      linking={LinkingConfiguration}
      theme={DarkTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

const RootStack = createStackNavigator<any>();
const AuthStack = createStackNavigator<any>();
const AppBottomTab = createBottomTabNavigator<any>();
const AppStack = createStackNavigator<any>();

function RootNavigator() {
  const [refresh, setRefresh] = React.useState(false);
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="auth" options={{ animationEnabled: false }}>
        {props => <AuthStack.Navigator {...props} screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="login" component={LoginScreen} options={{ animationEnabled: false }} />
          <AuthStack.Screen name="signup" component={SignupScreen} options={{ animationEnabled: false }} />
          <AuthStack.Screen name="reset" component={ResetScreen} options={{ animationEnabled: false }} />
          <AuthStack.Screen name="terms" component={TermsScreen} options={{ animationEnabled: false }} />
          <AuthStack.Screen name="privacy" component={PrivacyScreen} options={{ animationEnabled: false }} />
        </AuthStack.Navigator>}
      </RootStack.Screen>
      <RootStack.Screen name="app" options={{ animationEnabled: false }}>
        {props =>
          <AppBottomTab.Navigator {...props} initialRouteName="projects" backBehavior={'history'} lazy={false} detachInactiveScreens={false}
            tabBarOptions={{ activeTintColor: '#ffffff', style: Platform.OS === 'web' ? { position: 'absolute', top: 0, width: root.desktopWidth, marginLeft: 'auto', marginRight: 'auto', backgroundColor: '#000000', borderTopWidth: 0 } : { backgroundColor: '#000000', borderTopWidth: 0 }, labelStyle: Platform.OS !== 'web' ? { top: -12, fontSize: 20 } : {} }}>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="logo"
                options={{
                  tabBarButton: props =>
                    <TouchableOpacity {...props} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <LogoSvg width={25} height={25} style={{ marginRight: 5, marginLeft: 15 }} />
                      <Text style={{ color: '#ffffff', fontSize: 20 }}>productabot</Text>
                    </TouchableOpacity>
                }}
              >
                {props => {
                  React.useEffect(() => {
                    const unsubscribe = props.navigation.addListener('tabPress', (e) => {
                      e.preventDefault();
                      props.navigation.navigate('app', {
                        screen: 'projects',
                        params: {
                          screen: 'projects',
                        },
                      });
                    });
                    return unsubscribe;
                  }, [props.navigation]);
                  return (<View />)
                }}
              </AppBottomTab.Screen>
            }
            <AppBottomTab.Screen name="projects">
              {props => {
                // React.useEffect(() => {
                //   const unsubscribe = props.navigation.addListener('tabPress', (e) => {
                //     e.preventDefault();
                //     props.navigation.navigate('app', {
                //       screen: 'projects',
                //       params: {
                //         screen: 'projects',
                //       },
                //     });
                //   });
                //   return unsubscribe;
                // }, [props.navigation]);
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="projects">
                    <AppStack.Screen name="projects">
                      {props => <ProjectsScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="project">
                      {props => <ProjectScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="kanban">
                      {props => <KanbanScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="document">
                      {props => <DocumentScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>
                )
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="calendar">
              {props => {
                // React.useEffect(() => {
                //   const unsubscribe = props.navigation.addListener('tabPress', (e) => {
                //     e.preventDefault();
                //     props.navigation.navigate('app', {
                //       screen: 'calendar',
                //       params: {
                //         screen: 'timesheet',
                //       },
                //     });
                //   });
                //   return unsubscribe;
                // }, [props.navigation]);
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="timesheet">
                    <AppStack.Screen name="timesheet">
                      {props => <CalendarScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="entry">
                      {props => <EntryScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>
                )
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="notes">
              {props => {
                // React.useEffect(() => {
                //   const unsubscribe = props.navigation.addListener('tabPress', (e) => {
                //     e.preventDefault();
                //     props.navigation.navigate('app', {
                //       screen: 'notes',
                //       params: {
                //         screen: 'notes',
                //       },
                //     });
                //   });
                //   return unsubscribe;
                // }, [props.navigation]);
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="notes">
                    <AppStack.Screen name="notes">
                      {props => <NotesScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="note">
                      {props => <NoteScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="settings">
              {props => {
                // React.useEffect(() => {
                //   const unsubscribe = props.navigation.addListener('tabPress', (e) => {
                //     e.preventDefault();
                //     props.navigation.navigate('app', {
                //       screen: 'settings',
                //       params: {
                //         screen: 'settings',
                //       },
                //     });
                //   });
                //   return unsubscribe;
                // }, [props.navigation]);
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="settings">
                    <AppStack.Screen name="settings">
                      {props => <SettingsScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="webcontrols"
                component={BlankScreen}
                options={{
                  tabBarButton: props =>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, width: 130, marginRight: 20 }}>
                      <TouchableOpacity style={{ borderColor: '#ffffff', borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, width: 25, marginRight: 30 }} onPress={() => { setRefresh(!refresh); }} >
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