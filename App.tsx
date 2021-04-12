import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MenuProvider } from 'react-native-popup-menu';

import useCachedResources from './hooks/useCachedResources';
import Navigation from './navigation';

import { Environment } from './Environment';
import Amplify, { Auth } from "aws-amplify";
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
  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <ApolloProvider client={client}>
        <SafeAreaProvider style={{ backgroundColor: '#000000' }}>
          <MenuProvider>
            <Navigation />
            <StatusBar />
          </MenuProvider>
        </SafeAreaProvider>
      </ApolloProvider>
    );
  }
}
