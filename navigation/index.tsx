import { NavigationContainer, DarkTheme, useNavigation, useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as React from 'react';
import { View, Platform, Text, TouchableOpacity, useWindowDimensions, Pressable } from 'react-native';
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
import BoardScreen from '../screens/BoardScreen';
import ItemScreen from '../screens/ItemScreen';
import NotificationsComponent from '../components/NotificationsComponent';
import NotesDesktopScreen from '../screens/NotesDesktopScreen';
import NotesMobileScreen from '../screens/NotesMobileScreen';
import NoteScreen from '../screens/NoteScreen';
import * as root from '../Root';
import DocumentScreen from '../screens/DocumentScreen';
import ResetScreen from '../screens/ResetScreen';
import * as Linking from 'expo-linking';
import TestScreen from '../screens/TestScreen';

export default function Navigation({ navigation, authenticated }: any) {
  return (
    <NavigationContainer
      theme={DarkTheme}
      linking={LinkingConfiguration}
      documentTitle={{
        formatter: (options, route) =>
          `productabot • ${options?.title ?? route?.name.replace('_', ' ')}`,
      }}
    >
      <RootNavigator authenticated={authenticated} />
    </NavigationContainer>
  );
}

const RootStack = createStackNavigator<any>();
const AuthStack = createStackNavigator<any>();
const AppBottomTab = createBottomTabNavigator<any>();
const AppStack = createStackNavigator<any>();
const MobileNotesStack = createDrawerNavigator<any>();

function RootNavigator({ authenticated }: any) {
  const window = useWindowDimensions();
  const [refresh, setRefresh] = React.useState(false);
  return (
    <RootStack.Navigator initialRouteName={authenticated ? 'app' : 'auth'} screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="auth" options={{ animationEnabled: false }}>
        {props => <AuthStack.Navigator {...props} initialRouteName="login" screenOptions={{ headerShown: false }} >
          <AuthStack.Screen name="login" component={LoginScreen} options={{ animationEnabled: false }} />
          <AuthStack.Screen name="signup" component={SignupScreen} options={{ animationEnabled: false }} />
          <AuthStack.Screen name="reset" component={ResetScreen} options={{ animationEnabled: false }} />
        </AuthStack.Navigator>}
      </RootStack.Screen>
      <RootStack.Screen name="app" options={{ animationEnabled: false }}>
        {props =>
          <AppBottomTab.Navigator {...props} initialRouteName="projects" backBehavior={'history'} lazy={false}
            tabBarOptions={{ activeTintColor: '#ffffff', style: Platform.OS === 'web' ? { position: 'absolute', top: 0, width: Math.min(window.width, root.desktopWidth), marginLeft: 'auto', marginRight: 'auto', backgroundColor: '#000000', borderTopWidth: 0 } : { backgroundColor: '#000000', borderTopWidth: 0 }, labelStyle: Platform.OS !== 'web' ? { top: -12, fontSize: 20 } : {} }}>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="logo" component={() => <View />}
                options={{
                  tabBarButton: props => {
                    const navigation = useNavigation();
                    // const URL = Linking.useURL();
                    return (
                      // ['projects', 'calendar', 'notes', 'settings'].includes(URL ? URL.split('/').reverse()[0] : '') ?
                      true ?
                        <TouchableOpacity {...props}
                          onPress={() => { navigation.navigate('app', { screen: 'projects', params: { screen: 'projects' } }); }}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', minWidth: window.width > 800 ? 160 : 30 }}>
                          <LogoSvg width={25} height={25} style={{ marginRight: 5, marginLeft: 15, borderWidth: 1, borderColor: '#ffffff', borderRadius: 5, borderStyle: 'solid' }} />
                          {(window.width > 800) && <Text style={{ color: '#ffffff', fontSize: 20 }}>productabot</Text>}
                        </TouchableOpacity>
                        :
                        <TouchableOpacity {...props}
                          onPress={() => { navigation.navigate('app', { screen: 'projects', params: { screen: 'projects' } }); }}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', minWidth: 160 }}>
                          <Text style={{ marginRight: 5, marginLeft: 15, width: 25, color: '#ffffff', textAlign: 'center' }}>←</Text>
                          <Text style={{ color: '#ffffff', fontSize: 20 }}>go back</Text>
                        </TouchableOpacity>
                    )
                  }
                }}
              />
            }
            <AppBottomTab.Screen name="projects" options={{
              title: `⧉${(root.desktopWeb && window.width < 800) ? `` : ` projects`}`,
              ...((root.desktopWeb && window.width < 800) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 190) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: '#ffffff' }}>⧉</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="projects" >
                    <AppStack.Screen name="projects">
                      {props => <ProjectsScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="project">
                      {props => <ProjectScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="board">
                      {props => <BoardScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="document">
                      {props => <DocumentScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="item">
                      {props => <ItemScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>
                )
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="calendar" options={{
              title: `▦ calendar`,
              ...((root.desktopWeb && window.width < 800) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 190) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: '#ffffff' }}>▦</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="calendar">
                    <AppStack.Screen name="calendar">
                      {props => <CalendarScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="entry">
                      {props => <EntryScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>
                )
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="notes" options={{
              title: `≡ notes`,
              ...((root.desktopWeb && window.width < 800) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 190) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: '#ffffff' }}>≡</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="notes">
                    <AppStack.Screen name="notes">
                      {props =>
                        Platform.OS === 'ios' ?
                          <MobileNotesStack.Navigator initialRouteName="innerNotes"
                            drawerStyle={{ width: 300 }} swipeEdgeWidth={400} screenOptions={{ headerShown: false, swipeEnabled: true, }}>
                            <MobileNotesStack.Screen name="innerNotes">
                              {props => <NotesMobileScreen {...props} refresh={refresh} />}
                            </MobileNotesStack.Screen>
                          </MobileNotesStack.Navigator>

                          :
                          <NotesDesktopScreen {...props} refresh={refresh} />
                      }
                    </AppStack.Screen>
                    <AppStack.Screen name="note">
                      {props => <NoteScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="settings" options={{
              title: `☉ settings`,
              ...((root.desktopWeb && window.width < 800) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 190) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: '#ffffff' }}>☉</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="settings">
                    <AppStack.Screen name="settings">
                      {props => <SettingsScreen {...props} refresh={refresh} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="test">
                      {props => <TestScreen {...props} refresh={refresh} />}
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
                        <Text style={{ color: '#ffffff', fontSize: 14 }}>↻</Text>
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