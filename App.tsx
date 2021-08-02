import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MenuProvider } from 'react-native-popup-menu';
import { View, Text } from 'react-native';
import { LoadingComponent } from './components/LoadingComponent';

import useCachedResources from './hooks/useCachedResources';
import Navigation from './navigation';

import { Environment } from './Environment';
import Amplify, { Auth } from "aws-amplify";
import { Platform, LogBox } from 'react-native';
import { WebSocketLink } from "@apollo/client/link/ws";
Platform.OS !== 'web' && LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
Amplify.configure({
  Auth: {
    identityPoolId: Environment.identityPoolId,
    region: Environment.region,
    identityPoolRegion: Environment.region,
    userPoolId: Environment.userPoolId,
    userPoolWebClientId: Environment.userPoolWebClientId,
    mandatorySignIn: true,
    authenticationFlowType: "USER_PASSWORD_AUTH"
  },
  API: {
    graphql_endpoint: Environment.endpoint,
    graphql_headers: async () => ({
      Authorization: "Bearer " + (await Auth.currentSession()).idToken.jwtToken
    }),
    endpoints: [
      {
        name: "1",
        endpoint: "https://lambda.productabot.com"
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
  React.useEffect(() => {
    const async = async () => {
      let user = await Auth.currentSession();
      if (user) {
        client.setLink(new WebSocketLink({
          uri: "wss://api.productabot.com/v1/graphql",
          options: {
            reconnect: true,
            connectionParams: async () => ({
              headers: {
                Authorization: "Bearer " + (await Auth.currentSession()).idToken.jwtToken
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
    async();
  })
  if (!isLoadingComplete && authenticated === null) {
    return (
      <View style={{ backgroundColor: '#000000', flex: 1 }}>
        <LoadingComponent />
      </View>
    );
  } else {
    return (
      <ApolloProvider client={client}>
        <SafeAreaProvider style={{ backgroundColor: '#000000' }}>
          <MenuProvider>
            <Navigation authenticated={authenticated} />
            <StatusBar />
          </MenuProvider>
        </SafeAreaProvider>
      </ApolloProvider>
    );
  }
}
