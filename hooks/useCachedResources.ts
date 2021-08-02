import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import * as Updates from 'expo-updates';

export default function useCachedResources() {
  const [isLoadingComplete, setLoadingComplete] = React.useState(false);

  // Load any resources or data that we need prior to rendering the app
  React.useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        SplashScreen.preventAutoHideAsync();

        // Load fonts
        await Font.loadAsync({
          "droid": require('../assets/fonts/DroidSansMono.ttf')
        });
      } catch (e) {
        // We might want to provide this error information to an error reporting service
        console.warn(e);
      } finally {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            setTimeout(() => SplashScreen.hideAsync(), 100);
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          } else {
            setLoadingComplete(true);
          }
        } catch (e) {
          setLoadingComplete(true);
        }
        SplashScreen.hideAsync();
      }
    }

    loadResourcesAndDataAsync();
  }, []);

  return isLoadingComplete;
}
