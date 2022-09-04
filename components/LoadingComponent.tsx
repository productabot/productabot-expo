import * as React from 'react';
import { View, Animated, Easing, useWindowDimensions, Platform } from 'react-native';
import { LoadingComponentMobile } from './LoadingComponentMobile';
export function LoadingComponent({ loading }) {
    const window = useWindowDimensions();
    const width = new Animated.Value(0);
    const opacity = new Animated.Value(0);
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
                <Animated.View style={{ height: 2, width: widthAnim, backgroundColor: '#0075ff', opacity: opacityAnim }} />
            </View>
            :
            loading ? <LoadingComponentMobile /> : <View />
    );
}