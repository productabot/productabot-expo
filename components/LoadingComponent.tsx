import * as React from 'react';
import { View, Animated, Easing, Platform } from 'react-native';
let heightValue1 = new Animated.Value(0);
let heightValue2 = new Animated.Value(0);
let heightValue3 = new Animated.Value(0);

export function LoadingComponent() {
    Animated.sequence([
        Animated.delay(0),
        Animated.loop(Animated.timing(heightValue1, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: false }))
    ]).start();
    Animated.sequence([
        Animated.delay(100),
        Animated.loop(Animated.timing(heightValue2, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: false }))
    ]).start();
    Animated.sequence([
        Animated.delay(200),
        Animated.loop(Animated.timing(heightValue3, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: false }))
    ]).start();
    const height1 = heightValue1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 35, 0] });
    const height2 = heightValue2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 35, 0] });
    const height3 = heightValue3.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 35, 0] });
    return (
        <View style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 75, height: 75, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderRadius: 0, padding: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', width: '100%' }}>
                    <Animated.View style={{ borderRadius: 10, height: height1, width: 10, backgroundColor: '#ffffff' }} />
                    <Animated.View style={{ borderRadius: 10, height: height2, width: 10, backgroundColor: '#ffffff' }} />
                    <Animated.View style={{ borderRadius: 10, height: height3, width: 10, backgroundColor: '#ffffff' }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', width: '100%', paddingTop: 5, paddingBottom: 5 }}>
                    <Animated.View style={{ borderRadius: 10, height: 10, width: 10, backgroundColor: '#ffffff' }} />
                    <Animated.View style={{ borderRadius: 10, height: 10, width: 10, backgroundColor: '#ffffff' }} />
                    <Animated.View style={{ borderRadius: 10, height: 10, width: 10, backgroundColor: '#ffffff' }} />
                </View>
            </View>
        </View>
    );
}