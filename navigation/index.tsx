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
import NotificationsComponent from '../components/NotificationsComponent';
import NotesDesktopScreen from '../screens/NotesDesktopScreen';
import NotesMobileScreen from '../screens/NotesMobileScreen';
import NoteScreen from '../screens/NoteScreen';
import * as root from '../Root';
import DocumentScreen from '../screens/DocumentScreen';
import ResetScreen from '../screens/ResetScreen';
import * as Linking from 'expo-linking';
import TestScreen from '../screens/TestScreen';
import { AnimatedLogo } from '../components/AnimatedLogo';
import TasksScreen from '../screens/TasksScreen';
import TaskScreen from '../screens/TaskScreen';
import EditTaskScreen from '../screens/EditTaskScreen';

export default function Navigation({ navigation, authenticated, setLoading, loading }: any) {
  return (
    <NavigationContainer
      theme={DarkTheme}
      linking={LinkingConfiguration}
      documentTitle={{
        formatter: (options, route) =>
          `productabot • ${options?.title ?? route?.name.replace('_', ' ')}`,
      }}
    >
      <RootNavigator authenticated={authenticated} setLoading={setLoading} loading={loading} />
    </NavigationContainer>
  );
}

const RootStack = createStackNavigator<any>();
const AuthStack = createStackNavigator<any>();
const AppBottomTab = createBottomTabNavigator<any>();
const AppStack = createStackNavigator<any>();
// const MobileNotesStack = createDrawerNavigator<any>();

function RootNavigator({ authenticated, setLoading, loading }: any) {
  const window = useWindowDimensions();
  const [refresh, setRefresh] = React.useState(false);
  return (
    <RootStack.Navigator initialRouteName={authenticated ? 'app' : 'auth'} screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="auth" options={{ animationEnabled: false }}>
        {props => <AuthStack.Navigator {...props} initialRouteName="login" screenOptions={{ headerShown: false }} >
          <AuthStack.Screen name="login" options={{ animationEnabled: false }}>
            {props => <LoginScreen {...props} setLoading={setLoading} />}
          </AuthStack.Screen>
          <AuthStack.Screen name="signup" options={{ animationEnabled: false }} >
            {props => <SignupScreen {...props} setLoading={setLoading} />}
          </AuthStack.Screen>
          <AuthStack.Screen name="reset" options={{ animationEnabled: false }} >
            {props => <ResetScreen {...props} setLoading={setLoading} />}
          </AuthStack.Screen>
        </AuthStack.Navigator>}
      </RootStack.Screen>
      <RootStack.Screen name="app" options={{ animationEnabled: false }}>
        {props =>
          <AppBottomTab.Navigator {...props} initialRouteName="projects" backBehavior={'history'} lazy={true}
            tabBarOptions={{ activeTintColor: '#ffffff', style: Platform.OS === 'web' ? { position: 'absolute', top: 0, width: Math.min(window.width, root.desktopWidth), marginLeft: 'auto', marginRight: 'auto', backgroundColor: '#000000', borderTopWidth: 0 } : { backgroundColor: '#000000', borderTopWidth: 0 }, labelStyle: Platform.OS !== 'web' ? { top: -13, fontSize: 18 } : {} }}>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="logo"
                options={{
                  tabBarButton: (props) => {
                    const navigation = useNavigation();
                    return (
                      <TouchableOpacity {...props}
                        onPress={() => { navigation.navigate('app', { screen: 'projects', params: { screen: 'projects' } }); }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', minWidth: window.width > 900 ? 160 : 30 }}>
                        <AnimatedLogo loading={loading} size={1} />
                        {(window.width > 900) && <Text style={{ color: '#ffffff', fontSize: 20 }}>productabot</Text>}
                      </TouchableOpacity>
                    )
                  }
                }}
              >
                {props => <View />}
              </AppBottomTab.Screen>
            }
            <AppBottomTab.Screen name="projects" options={{
              title: `⧉${(root.desktopWeb && window.width < 900) ? `` : ` projects`}`,
              ...((root.desktopWeb && window.width < 900) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 190) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15, marginTop: 3 }}><Text style={{ fontSize: 24, color: props.accessibilityState.selected ? '#ffffff' : '#7c7c7d' }}>⧉</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="projects" >
                    <AppStack.Screen name="projects">
                      {props => <ProjectsScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="project">
                      {props => <ProjectScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="document">
                      {props => <DocumentScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="entry">
                      {props => <EntryScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="task">
                      {props => <TaskScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="edit_task">
                      {props => <EditTaskScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>
                )
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="calendar" options={{
              title: `▦ calendar`,
              ...((root.desktopWeb && window.width < 900) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 190) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: props.accessibilityState.selected ? '#ffffff' : '#7c7c7d' }}>▦</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="calendar">
                    <AppStack.Screen name="calendar">
                      {props => <CalendarScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="entry">
                      {props => <EntryScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>
                )
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="tasks" options={{
              title: `☉ tasks`,
              ...((root.desktopWeb && window.width < 900) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 190) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: props.accessibilityState.selected ? '#ffffff' : '#7c7c7d' }}>☉</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="tasks">
                    <AppStack.Screen name="tasks">
                      {props => <TasksScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="task">
                      {props => <TaskScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="edit_task">
                      {props => <EditTaskScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="notes" options={{
              title: `≡ notes`,
              ...((root.desktopWeb && window.width < 900) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 190) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: props.accessibilityState.selected ? '#ffffff' : '#7c7c7d' }}>≡</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="notes">
                    {(window.width < 900) ?
                      <AppStack.Screen name="notes">
                        {props => <NotesMobileScreen {...props} refresh={refresh} setLoading={setLoading} />}
                      </AppStack.Screen>
                      :
                      <AppStack.Screen name="notes">
                        {props => <NotesDesktopScreen {...props} refresh={refresh} setLoading={setLoading} />}
                      </AppStack.Screen>
                    }
                    <AppStack.Screen name="note">
                      {props => <NoteScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="settings" options={{
              tabBarButton: props => <View />
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="settings">
                    <AppStack.Screen name="settings">
                      {props => <SettingsScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="test">
                      {props => <TestScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="webcontrols"
                component={BlankScreen}
                options={{
                  tabBarButton: props => {
                    const navigation = useNavigation();
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, width: 130, marginRight: 20 }}>
                        <TouchableOpacity style={{ borderColor: '#ffffff', borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, width: 25, marginRight: 10 }} onPress={() => { navigation.navigate('settings') }} >
                          <Text style={{ color: '#ffffff', fontSize: 14 }}>⚙️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ borderColor: '#ffffff', borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, width: 25, marginRight: 10 }} onPress={() => { setRefresh(!refresh); }} >
                          <Text style={{ color: '#ffffff', fontSize: 14 }}>↻</Text>
                        </TouchableOpacity>
                        <NotificationsComponent />
                      </View>
                    )
                  }
                }}
              />}
          </AppBottomTab.Navigator>
        }
      </RootStack.Screen>
    </RootStack.Navigator >
  );
}