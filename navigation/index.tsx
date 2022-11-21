import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { View, Platform, Text, TouchableOpacity, useWindowDimensions, Pressable, StatusBar, Animated, Easing, Image } from 'react-native';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LinkingConfiguration from './LinkingConfiguration';
import ProjectsScreen from '../screens/ProjectsScreen';
import ProjectScreen from '../screens/ProjectScreen';
import BlankScreen from '../screens/BlankScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import EntryScreen from '../screens/EntryScreen';
import NotesDesktopScreen from '../screens/NotesDesktopScreen';
import NotesMobileScreen from '../screens/NotesMobileScreen';
import NoteScreen from '../screens/NoteScreen';
import DocumentScreen from '../screens/DocumentScreen';
import ResetScreen from '../screens/ResetScreen';
import { AnimatedLogo } from '../components/AnimatedLogo';
import TasksScreen from '../screens/TasksScreen';
import TaskScreen from '../screens/TaskScreen';
import EditTaskScreen from '../screens/EditTaskScreen';
import TasksDesktopScreen from '../screens/TasksDesktopScreen';
import TimelinesScreen from '../screens/TimelinesScreen';
import TimelineScreen from '../screens/TimelineScreen';
import SearchScreen from '../screens/SearchScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { API, graphqlOperation } from "@aws-amplify/api";
import { TransitionPresets } from '@react-navigation/stack';

export default function Navigation({ authenticated, setLoading, loading, setBackgroundColor }: any) {
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

  React.useEffect(() => {
    StatusBar.setBarStyle(theme === 'light' ? 'dark-content' : 'light-content');
    setBackgroundColor(theme === 'light' ? 'dark' : 'light');
    if (Platform.OS === 'web') {
      const icons = document.querySelectorAll("link[rel~=icon]");
      for (let icon of icons) {
        icon.href = `/favicon_${theme}.png`;
      }
    }

  }, [theme]);

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
      subtitle: '#aaaaaa',
      delete: '#ff5555',
      placeholder: '#444444'
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
      subtitle: '#666666',
      delete: '#ff0000',
      placeholder: '#bbbbbb'
    },
  };

  return (
    <NavigationContainer
      theme={theme === 'dark' ? darkTheme : lightTheme}
      linking={LinkingConfiguration}
      documentTitle={{
        formatter: (options, route) => options?.title
        // `${route?.params?.state?.name ?? options?.title}`,
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
  const windowDimensions = useWindowDimensions();
  const [refresh, setRefresh] = React.useState(false);
  const { colors } = useTheme();
  function tabStyle(props) {
    return [props.style, { opacity: props.children.props.children[0].props.activeOpacity ? 1 : theme === 'dark' ? 0.6 : 0.4 }];
  }
  return (
    <RootStack.Navigator initialRouteName={authenticated ? 'app' : 'auth'} screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="auth" options={{ animationEnabled: false }}>
        {props => <AuthStack.Navigator {...props} initialRouteName={Platform.OS === 'web' ? 'login' : 'welcome'} screenOptions={{ headerShown: false, title: 'productabot' }} >
          <AuthStack.Screen name="login">
            {props => <LoginScreen {...props} setLoading={setLoading} loading={loading} setTheme={setTheme} theme={theme} />}
          </AuthStack.Screen>
          <AuthStack.Screen name="signup" >
            {props => <SignupScreen {...props} setLoading={setLoading} loading={loading} />}
          </AuthStack.Screen>
          <AuthStack.Screen name="reset" >
            {props => <ResetScreen {...props} setLoading={setLoading} loading={loading} />}
          </AuthStack.Screen>
          <AuthStack.Screen name="welcome">
            {props => <WelcomeScreen {...props} setLoading={setLoading} loading={loading} setTheme={setTheme} theme={theme} />}
          </AuthStack.Screen>
        </AuthStack.Navigator>}
      </RootStack.Screen>
      <RootStack.Screen name="app" options={{ animationEnabled: false }}>
        {props =>
          <AppBottomTab.Navigator {...props} initialRouteName="projectsTab" backBehavior={'history'}
            screenOptions={{ lazy: false, headerShown: false, tabBarActiveTintColor: colors.text, tabBarStyle: Platform.OS === 'web' ? { position: 'absolute', top: 0, width: '100%', marginLeft: 'auto', marginRight: 'auto', backgroundColor: colors.background, borderTopWidth: 0 } : { backgroundColor: colors.background, borderTopWidth: 0 }, tabBarLabelStyle: Platform.OS !== 'web' ? { top: -13, fontSize: 18 } : {}, tabBarIconStyle: { display: 'none' } }}>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="logo"
                options={{
                  tabBarButton: (props) => {
                    const navigation = useNavigation();
                    return (
                      <TouchableOpacity {...props}
                        href={`/`}
                        onPress={(e) => { e.preventDefault(); navigation.navigate('app', { screen: 'projectsTab', params: { screen: 'projects' } }); }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', minWidth: windowDimensions.width > 800 ? 160 : 30 }}>
                        <AnimatedLogo loading={loading} size={1} />
                        {(windowDimensions.width > 800) && <Text style={{ color: colors.text, fontSize: 20 }}>productabot</Text>}
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
              tabBarItemStyle: { maxWidth: 130, flexDirection: 'row', justifyContent: 'center' },
              tabBarLabelStyle: { fontSize: 12 },
              tabBarButton: (props) => <Pressable {...props} style={tabStyle(props)} href={`/projects`} onPress={(e) => { e.preventDefault(); props.onPress(); }} />,
            }}>
              {props => {
                const defaultAnimation = Platform.OS === 'web' ? { animationEnabled: false } : { animationEnabled: true, ...TransitionPresets.DefaultTransition };
                return (
                  <AppStack.Navigator {...props} screenOptions={({ route }) => { return { headerShown: false, title: `projects` } }} initialRouteName="projects" >
                    <AppStack.Screen name="projects" options={{ ...defaultAnimation }}>
                      {props => <ProjectsScreen {...props} refresh={refresh} setLoading={setLoading} setTheme={setTheme} theme={theme} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="project" options={{ ...defaultAnimation }}>
                      {props => <ProjectScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="document" options={{ ...defaultAnimation }}>
                      {props => <DocumentScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="entry" options={{ ...defaultAnimation }}>
                      {props => <EntryScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="task" options={{ ...defaultAnimation }}>
                      {props => <TaskScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="edit_task" options={{ ...defaultAnimation }}>
                      {props => <EditTaskScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>
                )
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="calendarTab" options={{
              title: `▦ calendar`,
              tabBarItemStyle: { maxWidth: 130, flexDirection: 'row', justifyContent: 'center' },
              tabBarLabelStyle: { fontSize: 12 },
              tabBarButton: (props) => <Pressable {...props} style={tabStyle(props)} href={`/calendar`} onPress={(e) => { e.preventDefault(); props.onPress(); }} />
            }}>
              {props => {
                const defaultAnimation = Platform.OS === 'web' ? { animationEnabled: false } : { animationEnabled: true, ...TransitionPresets.DefaultTransition };
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false, title: 'calendar' }} initialRouteName="calendar">
                    <AppStack.Screen name="calendar" options={{ ...defaultAnimation }}>
                      {props => <CalendarScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="entry" options={{ ...defaultAnimation }}>
                      {props => <EntryScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="task" options={{ ...defaultAnimation }}>
                      {props => <TaskScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="edit_task" options={{ ...defaultAnimation }}>
                      {props => <EditTaskScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>
                )
              }}
            </AppBottomTab.Screen>
            {Platform.OS === 'web' &&
              <AppBottomTab.Screen name="timelinesTab" options={{
                title: `⧖ timelines`,
                tabBarItemStyle: { maxWidth: 130, flexDirection: 'row', justifyContent: 'center' },
                tabBarLabelStyle: { fontSize: 12 },
                tabBarButton: (props) => <Pressable {...props} style={tabStyle(props)} href={`/notes`} onPress={(e) => { e.preventDefault(); props.onPress(); }} />
              }}>
                {props => {
                  const defaultAnimation = Platform.OS === 'web' ? { animationEnabled: false } : { animationEnabled: true, ...TransitionPresets.DefaultTransition };
                  return (
                    <AppStack.Navigator {...props} screenOptions={{ headerShown: false, title: 'timelines' }} initialRouteName="timelines">
                      <AppStack.Screen name="timelines" options={{ ...defaultAnimation }}>
                        {props => <TimelinesScreen {...props} refresh={refresh} setLoading={setLoading} />}
                      </AppStack.Screen>
                      <AppStack.Screen name="timeline" options={{ ...defaultAnimation }}>
                        {props => <TimelineScreen {...props} refresh={refresh} setLoading={setLoading} />}
                      </AppStack.Screen>
                    </AppStack.Navigator>)
                }}
              </AppBottomTab.Screen>}
            <AppBottomTab.Screen name="tasksTab" options={{
              title: `☉ tasks`,
              tabBarItemStyle: { maxWidth: 130, flexDirection: 'row', justifyContent: 'center' },
              tabBarLabelStyle: { fontSize: 12 },
              tabBarButton: (props) => <Pressable {...props} style={tabStyle(props)} href={`/tasks`} onPress={(e) => { e.preventDefault(); props.onPress(); }} />
            }}>
              {props => {
                const defaultAnimation = Platform.OS === 'web' ? { animationEnabled: false } : { animationEnabled: true, ...TransitionPresets.DefaultTransition };
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false, title: 'tasks' }} initialRouteName="tasks">
                    {(windowDimensions.width < 800) ?
                      <AppStack.Screen name="tasks" options={{ ...defaultAnimation }}>
                        {props => <TasksScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                      </AppStack.Screen>
                      :
                      <AppStack.Screen name="tasks" options={{ ...defaultAnimation }}>
                        {props => <TasksDesktopScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                      </AppStack.Screen>
                    }
                    <AppStack.Screen name="task" options={{ ...defaultAnimation }}>
                      {/* presentation: 'transparentModal' */}
                      {props => <TaskScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                    <AppStack.Screen name="edit_task" options={{ ...defaultAnimation }}>
                      {props => <EditTaskScreen {...props} refresh={refresh} setLoading={setLoading} loading={loading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="notesTab" options={{
              title: `≡ notes`,
              tabBarItemStyle: { maxWidth: 130, flexDirection: 'row', justifyContent: 'center' },
              tabBarLabelStyle: { fontSize: 12 },
              tabBarButton: (props) => <Pressable {...props} style={tabStyle(props)} href={`/notes`} onPress={(e) => { e.preventDefault(); props.onPress(); }} />
            }}>
              {props => {
                const defaultAnimation = Platform.OS === 'web' ? { animationEnabled: false } : { animationEnabled: true, ...TransitionPresets.DefaultTransition };
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false, title: 'notes' }} initialRouteName="notes">
                    {(windowDimensions.width < 400) ?
                      <AppStack.Screen name="notes" options={{ ...defaultAnimation }}>
                        {props => <NotesMobileScreen {...props} refresh={refresh} setLoading={setLoading} />}
                      </AppStack.Screen>
                      :
                      <AppStack.Screen name="notes" options={{ ...defaultAnimation }}>
                        {props => <NotesDesktopScreen {...props} refresh={refresh} setLoading={setLoading} />}
                      </AppStack.Screen>
                    }
                    <AppStack.Screen name="note" options={{ ...defaultAnimation }}>
                      {props => <NoteScreen {...props} refresh={refresh} setLoading={setLoading} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="settingsTab" options={{
              tabBarButton: props => <View />
            }}>
              {props => {
                const defaultAnimation = Platform.OS === 'web' ? { animationEnabled: false } : { animationEnabled: true, ...TransitionPresets.DefaultTransition };
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false, title: 'settings' }} initialRouteName="settings">
                    <AppStack.Screen name="settings" options={{ ...defaultAnimation }}>
                      {props => <SettingsScreen {...props} refresh={refresh} setLoading={setLoading} setTheme={setTheme} theme={theme} />}
                    </AppStack.Screen>
                  </AppStack.Navigator>)
              }}
            </AppBottomTab.Screen>
            <AppBottomTab.Screen name="searchTab" options={{
              tabBarButton: props => <View />
            }}>
              {props => {
                const defaultAnimation = Platform.OS === 'web' ? { animationEnabled: false } : { animationEnabled: true, ...TransitionPresets.DefaultTransition };
                return (
                  <AppStack.Navigator {...props} screenOptions={{ headerShown: false, title: 'search' }} initialRouteName="search">
                    <AppStack.Screen name="search" options={{ ...defaultAnimation }}>
                      {props => <SearchScreen {...props} refresh={refresh} setLoading={setLoading} setTheme={setTheme} theme={theme} />}
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
                    const [user, setUser] = React.useState({});
                    React.useEffect(() => {
                      const async = async () => {
                        setUser((await API.graphql(graphqlOperation(`{users {username image plan} }`))).data.users[0]);
                      }
                      async();
                    }, []);
                    const fadeValue = new Animated.Value(0.4);
                    Animated.loop(
                      Animated.sequence(
                        [
                          Animated.timing(fadeValue, { toValue: 1, duration: 1000, easing: Easing.sin, useNativeDriver: true }),
                          Animated.timing(fadeValue, { toValue: 0.4, duration: 1000, easing: Easing.sin, useNativeDriver: true })
                        ]
                      )).start();
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginRight: 20, marginLeft: 'auto' }}>
                        {user.plan === 'free' &&
                          <Animated.View style={{ opacity: fadeValue }}>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, marginRight: 10, paddingTop: 0, paddingBottom: 0, paddingLeft: 7, paddingRight: 7 }} href={`/settings`} onPress={(e) => { e.preventDefault(); navigation.navigate('settingsTab'); }} >
                              <Text style={{ color: colors.text, fontSize: 12 }}>{windowDimensions.width > 400 ? 'go premium ' : ''}✦</Text>
                            </TouchableOpacity></Animated.View>}
                        {user.username && <div title={'settings'}>
                          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, marginRight: 0, paddingTop: 0, paddingBottom: 0 }} href={`/settings`} onPress={(e) => { e.preventDefault(); navigation.navigate('settingsTab') }} >
                            <Image style={{ width: 25, height: 25, borderWidth: 1, borderColor: colors.border, borderRadius: 25, marginRight: 5 }} source={{ uri: `https://files.productabot.com/public/${user.image}` }} />
                            <Text style={{ color: colors.text, fontSize: 12 }}>{user.username}</Text>
                          </TouchableOpacity>
                        </div>}
                      </View>
                    )
                  }
                }}
              />}
          </AppBottomTab.Navigator>
        }
      </RootStack.Screen>
    </RootStack.Navigator>
  );
}