import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as React from 'react';
import { View, Platform, Text, TouchableOpacity, useWindowDimensions, Pressable, StatusBar } from 'react-native';
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
import TasksDesktopScreen from '../screens/TasksDesktopScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';

export default function Navigation({ navigation, authenticated, setLoading, loading, setBackgroundColor }: any) {
  const [theme, setTheme] = React.useState('dark');

  React.useEffect(() => {
    const async = async () => {
      let result = await AsyncStorage.getItem('theme');
      if (result) {
        setTheme(result);
      }
    }
    async();
  }, []);

  React.useEffect(() => { StatusBar.setBarStyle(theme === 'light' ? 'dark-content' : 'light-content'); setBackgroundColor(theme === 'light' ? 'dark' : 'light') }, [theme]);

  const darkTheme = {
    dark: true,
    colors: {
      primary: '#ffffff',
      background: '#000000',
      card: '#161616',
      hover: '#333333',
      text: '#ffffff',
      border: '#666666',
      notification: '#ffffff',
      subtitle: '#aaaaaa'
    },
  };

  const lightTheme = {
    dark: false,
    colors: {
      primary: '#000000',
      background: '#ffffff',
      card: '#E9E9E9',
      hover: '#aaaaaa',
      text: '#000000',
      border: '#666666',
      notification: '#000000',
      subtitle: '#666666'
    },
  };

  return (
    <NavigationContainer
      theme={theme === 'dark' ? darkTheme : lightTheme}
      linking={LinkingConfiguration}
      documentTitle={{
        formatter: (options, route) =>
          `productabot • ${options?.title ?? route?.name.replace('_', ' ')}`,
      }}
    >
      <RootNavigator authenticated={authenticated} setLoading={setLoading} loading={loading} setTheme={setTheme} theme={theme} />
    </NavigationContainer>
  );
}

const RootStack = createStackNavigator<any>();
const AuthStack = createStackNavigator<any>();
const AppBottomTab = createBottomTabNavigator<any>();
const AppStack = createStackNavigator<any>();
// const MobileNotesStack = createDrawerNavigator<any>();

function RootNavigator({ authenticated, setLoading, loading, setTheme, theme }: any) {
  const window = useWindowDimensions();
  const [refresh, setRefresh] = React.useState(false);
  const { colors } = useTheme();
  return (
    <RootStack.Navigator initialRouteName={authenticated ? 'app' : 'auth'} screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="auth" options={{ animationEnabled: false }}>
        {props => <AuthStack.Navigator {...props} initialRouteName="login" screenOptions={{ headerShown: false }} >
          <AuthStack.Screen name="login" options={{ animationEnabled: false }}>
            {props => <LoginScreen {...props} setLoading={setLoading} loading={loading} />}
          </AuthStack.Screen>
          <AuthStack.Screen name="signup" options={{ animationEnabled: false }} >
            {props => <SignupScreen {...props} setLoading={setLoading} loading={loading} />}
          </AuthStack.Screen>
          <AuthStack.Screen name="reset" options={{ animationEnabled: false }} >
            {props => <ResetScreen {...props} setLoading={setLoading} loading={loading} />}
          </AuthStack.Screen>
        </AuthStack.Navigator>}
      </RootStack.Screen>
      <RootStack.Screen name="app" options={{ animationEnabled: false }}>
        {props =>
          <AppBottomTab.Navigator {...props} initialRouteName="projectsTab" backBehavior={'history'}
            screenOptions={{ lazy: true, headerShown: false, tabBarActiveTintColor: colors.text, tabBarStyle: Platform.OS === 'web' ? { position: 'absolute', top: 0, width: '100%', marginLeft: 'auto', marginRight: 'auto', backgroundColor: colors.background, borderTopWidth: 0 } : { backgroundColor: colors.background, borderTopWidth: 0 }, tabBarLabelStyle: Platform.OS !== 'web' ? { top: -13, fontSize: 18 } : {}, tabBarIconStyle: { display: 'none' } }}>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="logo"
                options={{
                  tabBarButton: (props) => {
                    const navigation = useNavigation();
                    return (
                      <TouchableOpacity {...props}
                        onPress={() => { navigation.navigate('app', { screen: 'projectsTab', params: { screen: 'projects' } }); }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', minWidth: window.width > 950 ? 160 : 30 }}>
                        <AnimatedLogo loading={loading} size={1} />
                        {(window.width > 950) && <Text style={{ color: colors.text, fontSize: 20 }}>productabot</Text>}
                      </TouchableOpacity>
                    )
                  }
                }}
              >
                {props => <View />}
              </AppBottomTab.Screen>
            }
            <AppBottomTab.Screen name="projectsTab" options={{
              title: `⧉ projects`,
              tabBarItemStyle: { maxWidth: 140, width: 140 },
              ...((root.desktopWeb && window.width < 950) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 250) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15, marginTop: 3 }}><Text style={{ fontSize: 24, color: props.accessibilityState.selected ? '#ffffff' : '#7c7c7d' }}>⧉</Text></Pressable> })
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
            <AppBottomTab.Screen name="calendarTab" options={{
              title: `▦ calendar`,
              tabBarItemStyle: { maxWidth: 140, width: 140 },
              ...((root.desktopWeb && window.width < 950) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 250) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: props.accessibilityState.selected ? '#ffffff' : '#7c7c7d' }}>▦</Text></Pressable> })
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
            <AppBottomTab.Screen name="tasksTab" options={{
              title: `☉ tasks`,
              tabBarItemStyle: { maxWidth: 140, width: 140 },
              ...((root.desktopWeb && window.width < 950) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 250) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: props.accessibilityState.selected ? '#ffffff' : '#7c7c7d' }}>☉</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="tasks">
                    {(window.width < 950) ?
                      <AppStack.Screen name="tasks">
                        {props => <TasksScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                      </AppStack.Screen>
                      :
                      <AppStack.Screen name="tasks">
                        {props => <TasksDesktopScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                      </AppStack.Screen>
                    }
                    <AppStack.Screen name="task">
                      {props => <TaskScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="edit_task">
                      {props => <EditTaskScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="notesTab" options={{
              title: `≡ notes`,
              tabBarItemStyle: { maxWidth: 140, width: 140 },
              ...((root.desktopWeb && window.width < 950) && { tabBarButton: (props) => <Pressable {...props} style={{ width: (window.width - 250) / 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 15, marginRight: -15 }}><Text style={{ fontSize: 24, color: props.accessibilityState.selected ? '#ffffff' : '#7c7c7d' }}>≡</Text></Pressable> })
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="notes">
                    {(window.width < 400) ?
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
            <AppBottomTab.Screen name="settingsTab" options={{
              tabBarButton: props => <View />
            }}>
              {props => {
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false }} initialRouteName="settings">
                    <AppStack.Screen name="settings">
                      {props => <SettingsScreen {...props} refresh={refresh} setLoading={setLoading} setTheme={setTheme} theme={theme} />}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, marginRight: 20, marginLeft: 'auto' }}><TouchableOpacity style={{ borderColor: colors.text, borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, marginRight: 10, paddingTop: 0, paddingBottom: 0, paddingLeft: 7, paddingRight: 7 }} onPress={() => { navigation.navigate('settingsTab') }} >
                        <Text style={{ color: colors.text, fontSize: 14 }}>{window.width > 400 ? 'upgrade ' : ''}✦</Text>
                      </TouchableOpacity>
                        <TouchableOpacity style={{ borderColor: colors.text, borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, marginRight: 10, paddingTop: 0, paddingBottom: 0, width: 25 }} onPress={async () => {
                          let currentTheme = await AsyncStorage.getItem('theme');
                          let nextTheme = 'dark';
                          if (!currentTheme || currentTheme === 'dark') {
                            nextTheme = 'light';
                          }
                          await AsyncStorage.setItem('theme', nextTheme);
                          setTheme(nextTheme);
                        }} >
                          <Text style={{ color: colors.text, fontSize: 14 }}>{theme === 'dark' ? '☀' : '◗*'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ borderColor: colors.text, borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, marginRight: 10, paddingTop: 0, paddingBottom: 0, width: 25 }} onPress={() => { navigation.navigate('settingsTab') }} >
                          <Text style={{ color: colors.text, fontSize: 14 }}>⚙️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ borderColor: colors.text, borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, marginRight: 0, width: 25 }} onPress={() => { setRefresh(!refresh); }} >
                          <Text style={{ color: colors.text, fontSize: 14 }}>↻</Text>
                        </TouchableOpacity>
                        {/* <NotificationsComponent /> */}
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