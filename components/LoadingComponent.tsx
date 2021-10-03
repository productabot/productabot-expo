import * as React from 'react';
import { View, Animated, Easing, useWindowDimensions, Platform } from 'react-native';
import { StartupComponent } from './StartupComponent';
export function LoadingComponent({ loading }) {
    const window = useWindowDimensions();
    const [width, setWidth] = React.useState(new Animated.Value(0));
    const [opacity, setOpacity] = React.useState(new Animated.Value(0));
    React.useEffect(() => {
        if (loading) {
            opacity.setValue(0);
            width.setValue(0);
            Animated.sequence([Animated.timing(width, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: Platform.OS === 'web' ? true : false })]).start();
        }
        else {
            width.setValue(1);
            opacity.setValue(0);
            Animated.sequence([Animated.timing(opacity, { toValue: 1, duration: 50, easing: Easing.ease, useNativeDriver: Platform.OS === 'web' ? true : false })]).start();
        }
    }, [loading]);
    const widthAnim = width.interpolate({ inputRange: [0, 1], outputRange: [0, window.width] });
    const opacityAnim = opacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    return (
        Platform.OS === 'web' ?
            <View style={{ position: 'absolute', width: '100%', height: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                <Animated.View style={{ height: 1, width: widthAnim, backgroundColor: '#ffffff', opacity: opacityAnim }} />
            </View>
            :
            // loading ?
            //     <View style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            //         <View style={{ width: 75, height: 75, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderRadius: 10, padding: 5 }}>
            //             <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', width: '100%' }}>
            //                 <View style={{ borderRadius: 10, height: 15, width: 10, backgroundColor: '#ffffff' }} />
            //                 <View style={{ borderRadius: 10, height: 25, width: 10, backgroundColor: '#ffffff' }} />
            //                 <View style={{ borderRadius: 10, height: 38, width: 10, backgroundColor: '#ffffff' }} />
            //             </View>
            //             <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', width: '100%', paddingTop: 5, paddingBottom: 5 }}>
            //                 <View style={{ borderRadius: 10, height: 10, width: 10, backgroundColor: '#ffffff' }} />
            //                 <View style={{ borderRadius: 10, height: 10, width: 10, backgroundColor: '#ffffff' }} />
            //                 <View style={{ borderRadius: 10, height: 10, width: 10, backgroundColor: '#ffffff' }} />
            //             </View>
            //         </View>
            //     </View>
            //     :
            //     <View />
            loading ? <StartupComponent /> : <View />
        // <StartupComponent />
    );
}