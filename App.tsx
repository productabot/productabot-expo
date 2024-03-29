import React from 'react';
import { MenuProvider } from 'react-native-popup-menu';
import { SafeAreaView, View } from 'react-native';
import { LoadingComponent } from './components/LoadingComponent';
import { AnimatedLogo } from './components/AnimatedLogo';
import useCachedResources from './hooks/useCachedResources';
import Navigation from './navigation';
import { Environment } from './Environment';
import { Amplify } from "@aws-amplify/core";
import { Auth } from "@aws-amplify/auth";
import { API, graphqlOperation } from "@aws-amplify/api";
import { Platform, LogBox } from 'react-native';
import { WebSocketLink } from "@apollo/client/link/ws";
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { enableFreeze } from 'react-native-screens';
import Purchases from 'react-native-purchases';

enableFreeze(true);

Amplify.configure({
  Auth: {
    identityPoolId: Environment.identityPoolId,
    region: Environment.region,
    identityPoolRegion: Environment.region,
    userPoolId: Environment.userPoolId,
    userPoolWebClientId: Environment.userPoolWebClientId,
    mandatorySignIn: true,
    authenticationFlowType: "USER_PASSWORD_AUTH",
  },
  API: {
    graphql_endpoint: Environment.endpoint,
    graphql_headers: async () => ({
      Authorization: "Bearer " + (await Auth.currentSession()).getIdToken().getJwtToken()
    }),
    endpoints: [
      {
        name: "1",
        endpoint: "https://lambda.productabot.com",
        custom_header: async () => ({
          Authorization: (await Auth.currentSession()).getIdToken().getJwtToken(),
        })
      }
    ]
  },
  Storage: {
    AWSS3: {
      bucket: Environment.bucket,
      region: Environment.region
    }
  },
  Analytics: {
    disabled: true
  }
});

import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
const client = new ApolloClient({ cache: new InMemoryCache() });

export default function App() {
  const isLoadingComplete = useCachedResources();
  const [authenticated, setAuthenticated] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [backgroundColor, setBackgroundColor] = React.useState('dark');

  React.useEffect(() => {
    const async = async () => {
      if (Platform.OS === 'ios' && Constants.appOwnership !== 'expo') {
        Purchases.setDebugLogsEnabled(true);
        await Purchases.setup("appl_XhFtNHlywNlrGoNXQddwsdenqll");
      }
    }
    async();
  }, []);

  React.useEffect(() => {
    const async = async () => {
      Platform.OS !== 'web' && LogBox.ignoreLogs([
        'ReactNativeFiberHostComponent: Calling getNode() on the ref of an Animated component is no longer necessary. You can now directly use the ref instead. This method will be removed in a future release.',
        'Constants.platform.ios.model has been deprecated in favor of expo-device\'s Device.modelName property. This API will be removed in SDK 45.'
      ]);
      try {
        let user = await Auth.currentSession();

        if (Platform.OS === 'ios' && Constants.appOwnership !== 'expo') {
          await Purchases.logIn(user.getIdToken().decodePayload().sub);
        }

        if (user) {
          Platform.OS === 'ios' && registerForPushNotificationsAsync();
          client.setLink(new WebSocketLink({
            uri: "wss://api.productabot.com/v1/graphql",
            options: {
              reconnect: true,
              connectionParams: async () => ({
                headers: {
                  Authorization: "Bearer " + (await Auth.currentSession()).getIdToken().getJwtToken()
                }
              })
            }
          }));
          setAuthenticated(true);
        }
        else {
          setAuthenticated(false);
        }
      }
      catch (err) {
        setAuthenticated(false);
      }
    }
    async();
  }, []);

  if (!isLoadingComplete || authenticated === null) {
    // if (true) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
        <AnimatedLogo size={2.5} startup={true} />
      </SafeAreaView>
    );
  } else {
    return (
      <ApolloProvider client={client}>
        <MenuProvider>
          <SafeAreaView style={{ backgroundColor: backgroundColor === 'light' ? '#000000' : '#ffffff', height: '100%', width: '100%' }}>
            <Navigation authenticated={authenticated} setLoading={setLoading} loading={loading} setBackgroundColor={setBackgroundColor} />
          </SafeAreaView>
          <LoadingComponent loading={loading} />
        </MenuProvider>
      </ApolloProvider>
    );
  }
}


async function registerForPushNotificationsAsync() {
  let token;
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    await API.graphql(graphqlOperation(`mutation {update_users(where: {id: {_is_null: false}}, _set: {push_token: "${token}"}) {affected_rows}}`));
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}