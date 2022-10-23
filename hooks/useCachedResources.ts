import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import * as Updates from 'expo-updates';

export default function useCachedResources() {
  const [isLoadingComplete, setLoadingComplete] = React.useState(false);

  React.useEffect(() => {
    const async = async () => {
      try {
        SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.log(e);
      } finally {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            setTimeout(async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            }, 1000);
          } else {
            setLoadingComplete(true);
          }
        } catch (e) {
          setLoadingComplete(true);
        }
        SplashScreen.hideAsync();
      }
    }
    async();
  }, []);

  return isLoadingComplete;
}
